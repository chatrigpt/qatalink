export default async (_request:Request,context:any)=>{
  const countryCode=String(context?.geo?.country?.code||'').toUpperCase();
  return new Response(JSON.stringify({country_code:countryCode||null}),{
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}
  });
};

export const config={path:'/api/geo'};
