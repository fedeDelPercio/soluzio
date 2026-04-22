import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    // Leer token JWT del header Authorization (enviado por el browser)
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar token contra Supabase Auth usando el admin client
    const admin = createAdminClient()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol administrador
    const { data: perfil } = await admin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!perfil || perfil.rol !== 'administrador') {
      return NextResponse.json({ error: 'Solo administradores pueden analizar contratos' }, { status: 403 })
    }

    const { ruta_archivo } = await req.json()
    if (!ruta_archivo) {
      return NextResponse.json({ error: 'Falta ruta_archivo' }, { status: 400 })
    }

    // Llamar al Edge Function con service role (nunca expira, no depende del JWT del browser)
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-contract`
    const res = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ ruta_archivo, user_id: user.id, solo_analisis: true }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? 'Error al analizar el contrato' },
        { status: res.status },
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
