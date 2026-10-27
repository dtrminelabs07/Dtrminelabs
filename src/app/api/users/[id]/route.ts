import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){const {response,user}=await requireAdmin();if(response)return response;const {id}=await params;const parsed=z.object({name:z.string().trim().min(1).max(120).optional(),role:z.enum(["ADMIN","STAFF"]).optional()}).safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Data tidak valid."},{status:400});if(user?.id===id&&parsed.data.role==="STAFF")return NextResponse.json({error:"Admin tidak dapat menurunkan peran akunnya sendiri."},{status:400});return NextResponse.json(await db.user.update({where:{id},data:parsed.data,select:{id:true,name:true,email:true,role:true,createdAt:true}}))}
