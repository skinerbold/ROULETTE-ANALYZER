import { supabase } from './supabase'
import { UserSession } from './types'

export const saveUserSession = async (sessionData: UserSession, sessionId?: string) => {
  try {
    if (sessionId) {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          ...sessionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
      
      if (error) throw error
      return { success: true, sessionId }
    } else {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          ...sessionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, sessionId: data.id }
    }
  } catch (error) {
    console.error('Erro ao salvar sessão:', error)
    return { success: false, error }
  }
}

export const loadUserSession = async (userId: string) => {
  try {
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) throw error
    return { success: true, session: sessions?.[0] || null }
  } catch (error) {
    console.error('Erro ao carregar sessão:', error)
    return { success: false, error }
  }
}