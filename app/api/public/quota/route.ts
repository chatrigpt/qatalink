import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
function db(){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
export async function GET(req:NextRequest){const slug=String(req.nextUrl.searchParams.get('slug')||'');if(!slug)return NextResponse.json({allowed:false},{status:400});const {data}=await db().rpc('qatalink_public_whatsapp_gate',{p_slug:slug,p_consume:false});return NextResponse.json(data||{allowed:false},{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:NextRequest){const body=await req.json().catch(()=>({}));const slug=String(body?.slug||'');if(!slug)return NextResponse.json({allowed:false},{status:400});const {data,error}=await db().rpc('qatalink_public_whatsapp_gate',{p_slug:slug,p_consume:true});if(error)return NextResponse.json({allowed:false},{status:400});return NextResponse.json(data||{allowed:false},{headers:{'Cache-Control':'no-store'}})}
