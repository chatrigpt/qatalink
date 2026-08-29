import fs from 'node:fs';
import path from 'node:path';

const manifestFile='android/app/src/main/AndroidManifest.xml';
const javaDir='android/app/src/main/java/com/qatalink/app';
let xml=fs.readFileSync(manifestFile,'utf8');

const permissions=[
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
];
for(const permission of permissions){
  const name=permission.match(/android:name="([^"]+)/)?.[1]||'';
  if(name&&!xml.includes(`android:name="${name}"`))xml=xml.replace('<application',`${permission}\n    <application`);
}

if(!xml.includes('android:scheme="qatalink"')){
  const filters=`
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="qatalink" />
            </intent-filter>
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="qatalink.com" android:pathPrefix="/livreur/" />
                <data android:scheme="https" android:host="qatalink.com" android:pathPrefix="/ops/" />
            </intent-filter>
`;
  const marker='        </activity>';
  if(!xml.includes(marker))throw new Error('MainActivity closing tag not found');
  xml=xml.replace(marker,`${filters}${marker}`);
}

xml=xml.replace(/android:icon="@[^"]+"/,'android:icon="@mipmap/ic_launcher"');
xml=xml.replace(/android:roundIcon="@[^"]+"/,'android:roundIcon="@mipmap/ic_launcher_round"');

if(!xml.includes('QatalinkBackgroundLocationService')){
  xml=xml.replace('</application>',`        <service android:name=".QatalinkBackgroundLocationService" android:foregroundServiceType="location" android:exported="false" android:stopWithTask="false" />\n    </application>`);
}
fs.writeFileSync(manifestFile,xml);

fs.mkdirSync(javaDir,{recursive:true});
fs.writeFileSync(path.join(javaDir,'MainActivity.java'),`package com.qatalink.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(QatalinkBackgroundLocationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);

fs.writeFileSync(path.join(javaDir,'QatalinkBackgroundLocationPlugin.java'),`package com.qatalink.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "QatalinkBackgroundLocation")
public class QatalinkBackgroundLocationPlugin extends Plugin {
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void start(PluginCall call) {
        String token = call.getString("token", "").trim();
        if (token.isEmpty()) { call.reject("TOKEN_REQUIRED"); return; }
        if (!hasLocationPermission()) { call.reject("LOCATION_PERMISSION_REQUIRED"); return; }
        Intent intent = new Intent(getContext(), QatalinkBackgroundLocationService.class);
        intent.setAction(QatalinkBackgroundLocationService.ACTION_START);
        intent.putExtra("token", token);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ContextCompat.startForegroundService(getContext(), intent);
        else getContext().startService(intent);
        JSObject ret = new JSObject(); ret.put("active", true); call.resolve(ret);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), QatalinkBackgroundLocationService.class);
        intent.setAction(QatalinkBackgroundLocationService.ACTION_STOP);
        getContext().startService(intent);
        JSObject ret = new JSObject(); ret.put("active", false); call.resolve(ret);
    }

    @PluginMethod
    public void status(PluginCall call) {
        String token = getContext().getSharedPreferences("qatalink_delivery", 0).getString("driver_token", "");
        JSObject ret = new JSObject(); ret.put("active", token != null && !token.isEmpty()); call.resolve(ret);
    }
}
`);

fs.writeFileSync(path.join(javaDir,'QatalinkBackgroundLocationService.java'),`package com.qatalink.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class QatalinkBackgroundLocationService extends Service implements LocationListener {
    public static final String ACTION_START = "com.qatalink.app.START_DELIVERY_TRACKING";
    public static final String ACTION_STOP = "com.qatalink.app.STOP_DELIVERY_TRACKING";
    private static final String CHANNEL_ID = "qatalink_delivery_tracking";
    private static final int NOTIFICATION_ID = 22501;
    private static final long MIN_SEND_MS = 4500L;
    private static final long WATCHDOG_MS = 15000L;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;
    private SharedPreferences prefs;
    private HandlerThread locationThread;
    private Handler locationHandler;
    private String token = "";
    private long lastSentAt = 0L;
    private long lastLocationAt = 0L;
    private boolean explicitStop = false;

    private final Runnable watchdog = new Runnable() {
        @Override public void run() {
            if (token == null || token.isEmpty() || explicitStop) return;
            long now = System.currentTimeMillis();
            if (now - lastLocationAt > 12000L) {
                Location last = bestLastKnown();
                if (last != null) emitLocation(last, true);
            }
            if (now - lastLocationAt > 45000L) startLocationUpdates();
            if (locationHandler != null) locationHandler.postDelayed(this, WATCHDOG_MS);
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences("qatalink_delivery", MODE_PRIVATE);
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Qatalink:DeliveryTracking");
        locationThread = new HandlerThread("QatalinkDeliveryLocation");
        locationThread.start();
        locationHandler = new Handler(locationThread.getLooper());
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_STOP.equals(action)) { explicitStop = true; stopTracking(); return START_NOT_STICKY; }
        explicitStop = false;
        String incoming = intent != null ? intent.getStringExtra("token") : null;
        if (incoming != null && !incoming.trim().isEmpty()) {
            token = incoming.trim(); prefs.edit().putString("driver_token", token).apply();
        } else token = prefs.getString("driver_token", "");
        if (token == null || token.isEmpty()) { stopSelf(); return START_NOT_STICKY; }
        createChannel();
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        else startForeground(NOTIFICATION_ID, notification);
        if (wakeLock != null && !wakeLock.isHeld()) wakeLock.acquire();
        startLocationUpdates();
        if (locationHandler != null) { locationHandler.removeCallbacks(watchdog); locationHandler.post(watchdog); }
        return START_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Suivi des livraisons", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Maintient la position du livreur active pendant une livraison.");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent launch = new Intent(this, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.qatalink_logo)
            .setContentTitle("Qatalink Livraison")
            .setContentText("Suivi GPS actif pendant la livraison")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pending)
            .build();
    }

    private boolean hasPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void startLocationUpdates() {
        if (!hasPermission() || locationManager == null || locationHandler == null) { if (!hasPermission()) stopTracking(); return; }
        try {
            locationManager.removeUpdates(this);
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER))
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 4000L, 1.5f, this, locationThread.getLooper());
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 6000L, 2.5f, this, locationThread.getLooper());
            Location last = bestLastKnown(); if (last != null) emitLocation(last, true);
        } catch (Exception ignored) {}
    }

    private Location bestLastKnown() {
        if (!hasPermission() || locationManager == null) return null;
        Location best = null;
        try {
            for (String provider : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER}) {
                Location candidate = locationManager.getLastKnownLocation(provider);
                if (candidate != null && (best == null || candidate.getTime() > best.getTime())) best = candidate;
            }
        } catch (Exception ignored) {}
        return best;
    }

    @Override public void onLocationChanged(@NonNull Location location) { emitLocation(location, false); }

    private void emitLocation(Location location, boolean watchdogSend) {
        double lat = location.getLatitude(), lng = location.getLongitude();
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (Math.abs(lat) < 1e-8 && Math.abs(lng) < 1e-8)) return;
        long now = System.currentTimeMillis(); lastLocationAt = now;
        if (now - lastSentAt < MIN_SEND_MS) return;
        if (watchdogSend && location.getTime() > 0 && now - location.getTime() > 180000L) return;
        lastSentAt = now;
        final float accuracy = location.hasAccuracy() ? location.getAccuracy() : Float.NaN;
        final float bearing = location.hasBearing() ? location.getBearing() : Float.NaN;
        final float speed = location.hasSpeed() ? location.getSpeed() : Float.NaN;
        executor.execute(() -> postLocation(lat, lng, accuracy, bearing, speed));
    }

    private void postLocation(double lat, double lng, float accuracy, float bearing, float speed) {
        HttpURLConnection conn = null;
        try {
            JSONObject body = new JSONObject();
            body.put("token", token); body.put("action", "location"); body.put("lat", lat); body.put("lng", lng); body.put("source", "android_background");
            if (!Float.isNaN(accuracy)) body.put("accuracy", accuracy);
            if (!Float.isNaN(bearing)) body.put("heading", bearing);
            if (!Float.isNaN(speed)) body.put("speed", speed);
            byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
            conn = (HttpURLConnection) new URL("https://qatalink.com/api/delivery/driver").openConnection();
            conn.setRequestMethod("POST"); conn.setConnectTimeout(10000); conn.setReadTimeout(10000); conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json"); conn.setRequestProperty("Accept", "application/json");
            conn.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream os = conn.getOutputStream()) { os.write(bytes); }
            int code = conn.getResponseCode();
            if (code == 400 || code == 404 || code == 410) stopTracking();
        } catch (Exception ignored) { } finally { if (conn != null) conn.disconnect(); }
    }

    private void stopTracking() {
        explicitStop = true;
        try { if (locationManager != null) locationManager.removeUpdates(this); } catch (Exception ignored) {}
        if (locationHandler != null) locationHandler.removeCallbacks(watchdog);
        if (prefs != null) prefs.edit().remove("driver_token").apply();
        token = "";
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
        stopSelf();
    }

    @Override public void onDestroy() {
        try { if (locationManager != null) locationManager.removeUpdates(this); } catch (Exception ignored) {}
        if (locationHandler != null) locationHandler.removeCallbacksAndMessages(null);
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (locationThread != null) locationThread.quitSafely();
        executor.shutdownNow(); super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
`);

console.log('Qatalink Android permissions, deep links and screen-off delivery tracking registered');
