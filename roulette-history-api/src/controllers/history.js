import { supabase } from '../config/supabase.js';

/**
 * Busca histórico de uma roleta específica (últimos 500 números)
 */
export const getRouletteHistory = async (req, res) => {
  const { rouletteId } = req.params;
  const limit = parseInt(req.query.limit) || 500;

  try {
    const { data, error } = await supabase
      .from('roulette_history')
      .select('number, timestamp, position')
      .eq('roulette_id', rouletteId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`❌ Erro ao buscar histórico de ${rouletteId}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar histórico',
        details: error.message
      });
    }

    // Converter timestamps para formato legível
    const history = data.map(entry => ({
      number: entry.number,
      timestamp: entry.timestamp,
      date: new Date(entry.timestamp).toISOString(),
      position: entry.position
    }));

    console.log(`📊 Histórico de ${rouletteId} retornado: ${history.length} registros`);

    res.json({
      success: true,
      rouletteId,
      count: history.length,
      history
    });
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Busca metadados de uma roleta específica
 */
export const getRouletteMetadata = async (req, res) => {
  const { rouletteId } = req.params;

  try {
    const { data, error } = await supabase
      .from('roulette_metadata')
      .select('*')
      .eq('roulette_id', rouletteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Roleta não encontrada'
        });
      }
      
      console.error(`❌ Erro ao buscar metadata de ${rouletteId}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar metadados',
        details: error.message
      });
    }

    console.log(`📊 Metadata de ${rouletteId} retornado`);

    res.json({
      success: true,
      metadata: {
        rouletteId: data.roulette_id,
        totalSpins: data.total_spins,
        lastNumber: data.last_number,
        lastUpdate: data.last_update,
        numberFrequency: data.number_frequency || {}
      }
    });
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Busca metadados de todas as roletas
 */
export const getAllRouletteMetadata = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roulette_metadata')
      .select('*')
      .order('total_spins', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar todos os metadados:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar metadados',
        details: error.message
      });
    }

    const metadata = data.map(item => ({
      rouletteId: item.roulette_id,
      totalSpins: item.total_spins,
      lastNumber: item.last_number,
      lastUpdate: item.last_update,
      numberFrequency: item.number_frequency || {}
    }));

    console.log(`📊 Metadados de todas as roletas retornados: ${metadata.length} roletas`);

    res.json({
      success: true,
      count: metadata.length,
      metadata
    });
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};
