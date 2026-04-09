import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const employeeId = searchParams.get('employeeId')

    // Token-based access for employees
    if (token) {
      const supabase = await createServiceClient()
      const { data: employee, error } = await supabase
        .from('employees')
        .select('id, workspace_id, full_name')
        .eq('availability_token', token)
        .single()

      if (error || !employee) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
      }

      const { data: availability } = await supabase
        .from('availability')
        .select('*')
        .eq('employee_id', employee.id)
        .order('day_of_week')

      return NextResponse.json({ employee, availability: availability || [] })
    }

    // Auth-based access for managers
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const query = supabase
      .from('availability')
      .select('*, employees(full_name, phone)')
      .eq('workspace_id', workspaceId.data)
      .order('day_of_week')

    if (employeeId) {
      query.eq('employee_id', employeeId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ availability: data })
  } catch (err) {
    console.error('GET /api/availability error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, availability } = body

    // Token-based write for employees
    if (token) {
      const supabase = await createServiceClient()
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, workspace_id')
        .eq('availability_token', token)
        .single()

      if (empError || !employee) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
      }

      // Upsert all availability rows for this employee
      const rows = availability.map((a: { day_of_week: number; start_time: string; end_time: string }) => ({
        workspace_id: employee.workspace_id,
        employee_id: employee.id,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
      }))

      // Delete existing and re-insert
      await supabase.from('availability').delete().eq('employee_id', employee.id)

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('availability').insert(rows)
        if (insertError) throw insertError
      }

      return NextResponse.json({ success: true })
    }

    // Auth-based write for managers
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('availability')
      .insert({ ...body, workspace_id: workspaceId.data })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ availability: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/availability error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, day_of_week, start_time, end_time } = body

    if (token) {
      const supabase = await createServiceClient()
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, workspace_id')
        .eq('availability_token', token)
        .single()

      if (empError || !employee) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('availability')
        .upsert({
          workspace_id: employee.workspace_id,
          employee_id: employee.id,
          day_of_week,
          start_time,
          end_time,
        }, { onConflict: 'employee_id,day_of_week' })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ availability: data })
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } catch (err) {
    console.error('PUT /api/availability error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
