self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification?.data?.url||'/dashboard';
  event.waitUntil((async()=>{
    const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of all){
      if('focus'in client){await client.focus();if('navigate'in client)await client.navigate(url);return}
    }
    if(self.clients.openWindow)await self.clients.openWindow(url);
  })());
});
