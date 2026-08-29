import fs from 'node:fs';
import path from 'node:path';

const javaDir='android/app/src/main/java/com/qatalink/pro';
const mainFile=path.join(javaDir,'MainActivity.java');
if(!fs.existsSync(mainFile))throw new Error('MainActivity.java not found after Android package fix');

let main=fs.readFileSync(mainFile,'utf8');
if(!main.includes('registerPlugin(QatalinkDownloadsPlugin.class);')){
  main=main.replace('registerPlugin(QatalinkBackgroundLocationPlugin.class);','registerPlugin(QatalinkBackgroundLocationPlugin.class);\n        registerPlugin(QatalinkDownloadsPlugin.class);');
  fs.writeFileSync(mainFile,main);
}

fs.writeFileSync(path.join(javaDir,'QatalinkDownloadsPlugin.java'),`package com.qatalink.pro;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "QatalinkDownloads")
public class QatalinkDownloadsPlugin extends Plugin {
    private String safeName(String input) {
        String value = input == null ? "qatalink-download" : input.trim();
        value = value.replaceAll("[\\\\/:*?\\\"<>|]", "-");
        if (value.isEmpty()) value = "qatalink-download";
        if (value.length() > 180) value = value.substring(0, 180);
        return value;
    }

    @PluginMethod
    public void save(PluginCall call) {
        String filename = safeName(call.getString("filename", "qatalink-download"));
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String base64 = call.getString("base64", "");
        if (base64 == null || base64.trim().isEmpty()) { call.reject("DATA_REQUIRED"); return; }
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            JSObject ret = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) { call.reject("DOWNLOAD_INSERT_FAILED"); return; }
                try (OutputStream out = resolver.openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("DOWNLOAD_STREAM_FAILED");
                    out.write(bytes); out.flush();
                } catch (Exception e) { resolver.delete(uri, null, null); throw e; }
                values.clear(); values.put(MediaStore.MediaColumns.IS_PENDING, 0); resolver.update(uri, values, null, null);
                ret.put("uri", uri.toString()); ret.put("filename", filename); call.resolve(ret); return;
            }
            File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!dir.exists() && !dir.mkdirs()) { call.reject("DOWNLOAD_DIR_FAILED"); return; }
            File file = new File(dir, filename);
            String base = filename, ext = ""; int dot = filename.lastIndexOf('.');
            if (dot > 0) { base = filename.substring(0,dot); ext = filename.substring(dot); }
            int n = 2; while (file.exists()) file = new File(dir, base + " (" + n++ + ")" + ext);
            try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes); out.flush(); }
            ret.put("uri", Uri.fromFile(file).toString()); ret.put("filename", file.getName()); call.resolve(ret);
        } catch (Exception error) { call.reject("DOWNLOAD_SAVE_FAILED", error); }
    }
}
`);

const manifest='android/app/src/main/AndroidManifest.xml';
let xml=fs.readFileSync(manifest,'utf8');
const legacy='<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />';
if(!xml.includes('android.permission.WRITE_EXTERNAL_STORAGE'))xml=xml.replace('<application',`${legacy}\n    <application`);
fs.writeFileSync(manifest,xml);
console.log('Qatalink native Android Downloads plugin registered');
