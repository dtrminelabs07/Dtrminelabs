import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
export async function GET(){const {response}=await requireAdmin();if(response)return response;return NextResponse.json(await db.user.findMany({where:{role:{not:"DEMO"}},select:{id:true,name:true,email:true,role:true,createdAt:true},orderBy:{name:"asc"}}))}
export async function POST(request:NextRequest){const {response}=await requireAdmin();if(response)return response;const schema=z.object({name:z.string().trim().min(1).max(120),email:z.string().email(),password:z.string().min(12).max(200),role:z.enum(["ADMIN","STAFF"])});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Periksa nama, email, dan kata sandi (minimal 12 karakter)."},{status:400});try{const user=await db.user.create({data:{...parsed.data,email:parsed.data.email.toLowerCase(),passwordHash:await bcrypt.hash(parsed.data.password,12)},select:{id:true,name:true,email:true,role:true,createdAt:true}});return NextResponse.json(user,{status:201})}catch{return NextResponse.json({error:"Email sudah digunakan atau data tidak dapat disimpan."},{status:409})}}
