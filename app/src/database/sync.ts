import { supabase, isSupabaseConfigured } from './client';

export async function syncToSupabase(table: string, action: 'put' | 'delete', data: any) {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const sbTable = table === 'sessions' ? 'test_sessions' : table;

    if (action === 'delete') {
      await supabase.from(sbTable).delete().eq('id', data);
      return;
    }

    let payload: any;

    if (table === 'instruments') {
      payload = {
        id: data.id,
        model_name: data.model || data.modelName || '',
        manufacturer: data.manufacturer || '',
        serial_number: data.serial || data.serialNumber || '',
        accuracy_class: data.accuracyClass || 'III',
        max_capacity: Number(data.max) || 0,
        min_capacity: Number(data.min) || 0,
        e_value: Number(data.e) || 0,
        d_value: Number(data.d) || 0,
        tare_max: data.tareType === 'none' ? 0 : Number(data.max) || 0,
      };
    } else if (table === 'users') {
      payload = {
        id: data.id,
        name: data.name,
        email: data.email || `${data.id}@metrocert.gov.in`,
        role: data.role || 'tester',
        active: data.active ?? true,
      };
    } else {
      payload = { ...data };
    }

    const { error } = await supabase.from(sbTable).upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase Sync Warning - ${sbTable}]:`, error.message);
    }
  } catch (err) {
    console.error(`[Supabase Sync Error]:`, err);
  }
}
