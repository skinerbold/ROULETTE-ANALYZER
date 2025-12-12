-- ============================================================================
-- TABELA: custom_strategies
-- Armazena estratégias personalizadas criadas pelos usuários
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_strategies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  numbers INTEGER[] NOT NULL,
  chip_count INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Índices para performance
CREATE INDEX idx_custom_strategies_chip_count ON custom_strategies(chip_count);
CREATE INDEX idx_custom_strategies_created_by ON custom_strategies(created_by);
CREATE INDEX idx_custom_strategies_active ON custom_strategies(is_active);

-- RLS (Row Level Security) - todos podem ler, apenas autenticados podem criar
ALTER TABLE custom_strategies ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler estratégias ativas
CREATE POLICY "Estratégias ativas são públicas"
  ON custom_strategies
  FOR SELECT
  USING (is_active = true);

-- Política: Usuários autenticados podem criar
CREATE POLICY "Usuários autenticados podem criar estratégias"
  ON custom_strategies
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política: Apenas criador pode atualizar
CREATE POLICY "Apenas criador pode atualizar sua estratégia"
  ON custom_strategies
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Política: Apenas criador pode deletar (desativar)
CREATE POLICY "Apenas criador pode deletar sua estratégia"
  ON custom_strategies
  FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_custom_strategies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_strategies_timestamp
  BEFORE UPDATE ON custom_strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_strategies_updated_at();

-- Trigger para converter array de strings em inteiros no INSERT
CREATE OR REPLACE FUNCTION convert_numbers_to_int_array()
RETURNS TRIGGER AS $$
BEGIN
  -- Se numbers vier como array de texto, converter para inteiros
  IF pg_typeof(NEW.numbers) = 'text[]'::regtype THEN
    NEW.numbers := ARRAY(SELECT unnest(NEW.numbers)::INTEGER);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER convert_numbers_before_insert
  BEFORE INSERT ON custom_strategies
  FOR EACH ROW
  EXECUTE FUNCTION convert_numbers_to_int_array();

-- ============================================================================
-- RESULTADO ESPERADO: 
-- - Tabela criada com suporte a estratégias personalizadas
-- - RLS configurado para segurança
-- - Todos podem ver, apenas autenticados podem criar
-- ============================================================================
