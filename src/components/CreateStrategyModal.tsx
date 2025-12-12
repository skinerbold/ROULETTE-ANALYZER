'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface CreateStrategyModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateStrategyModal({ onClose, onSuccess }: CreateStrategyModalProps) {
  const [strategyName, setStrategyName] = useState('')
  const [numbersInput, setNumbersInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const parseNumbers = (input: string): number[] | null => {
    try {
      // Remove espaços e divide por ponto e vírgula
      const parts = input.split(';').map(s => s.trim()).filter(s => s !== '')
      const numbers: number[] = []

      for (const part of parts) {
        const num = parseInt(part, 10)
        if (isNaN(num) || num < 0 || num > 36) {
          return null
        }
        numbers.push(num)
      }

      // Remover duplicatas
      return [...new Set(numbers)]
    } catch {
      return null
    }
  }

  const validateStrategy = (): { valid: boolean; message: string; numbers?: number[] } => {
    if (!strategyName.trim()) {
      return { valid: false, message: 'Digite um nome para a estratégia' }
    }

    if (strategyName.trim().length < 3) {
      return { valid: false, message: 'O nome deve ter pelo menos 3 caracteres' }
    }

    if (!numbersInput.trim()) {
      return { valid: false, message: 'Digite os números da estratégia' }
    }

    const numbers = parseNumbers(numbersInput)
    if (!numbers || numbers.length === 0) {
      return { valid: false, message: 'Formato inválido. Use números de 0-36 separados por ; (exemplo: 1;5;12;23)' }
    }

    if (numbers.length > 36) {
      return { valid: false, message: 'A estratégia não pode ter mais de 36 números' }
    }

    return { valid: true, message: '', numbers }
  }

  const handleSubmit = async () => {
    setError('')
    const validation = validateStrategy()

    if (!validation.valid) {
      setError(validation.message)
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Você precisa estar logado para criar estratégias')
        setIsSubmitting(false)
        return
      }

      const numbers = validation.numbers!
      const chipCount = numbers.length

      console.log('🔵 ENVIANDO PARA O BANCO:')
      console.log('🔵 name:', strategyName.trim())
      console.log('🔵 numbers:', numbers)
      console.log('🔵 numbers tipo:', typeof numbers)
      console.log('🔵 numbers[0] tipo:', typeof numbers[0])
      console.log('🔵 chip_count:', chipCount)

      const { error: insertError } = await supabase
        .from('custom_strategies')
        .insert({
          name: strategyName.trim(),
          numbers: numbers,
          chip_count: chipCount,
          created_by: user.id
        })

      if (insertError) {
        console.error('Erro ao criar estratégia:', insertError)
        setError('Erro ao salvar estratégia. Tente novamente.')
        setIsSubmitting(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Erro inesperado:', err)
      setError('Erro inesperado. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  const previewNumbers = parseNumbers(numbersInput)
  const chipCount = previewNumbers?.length || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Criar Nova Estratégia</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium">Estratégia criada com sucesso!</p>
                <p className="text-green-600 dark:text-green-400 text-sm">Ela já está disponível para todos os usuários.</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Nome da Estratégia */}
          <div className="space-y-2">
            <Label htmlFor="strategy-name" className="text-base font-medium">
              Nome da Estratégia
            </Label>
            <Input
              id="strategy-name"
              type="text"
              placeholder="Ex: Minha Estratégia Personalizada"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              className="text-base text-gray-900 dark:text-white"
              disabled={isSubmitting || success}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Este nome será exibido na lista de estratégias para todos os usuários
            </p>
          </div>

          {/* Números */}
          <div className="space-y-2">
            <Label htmlFor="strategy-numbers" className="text-base font-medium">
              Números da Estratégia
            </Label>
            <Textarea
              id="strategy-numbers"
              placeholder="Digite os números separados por ponto e vírgula&#10;Exemplo: 1;5;12;23;25;32"
              value={numbersInput}
              onChange={(e) => setNumbersInput(e.target.value)}
              rows={4}
              className="text-base font-mono text-gray-900 dark:text-white"
              disabled={isSubmitting || success}
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Números válidos: 0 a 36, separados por ";"
              </p>
              {chipCount > 0 && (
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {chipCount} {chipCount === 1 ? 'ficha' : 'fichas'}
                </p>
              )}
            </div>
          </div>

          {/* Preview */}
          {previewNumbers && previewNumbers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-medium">Preview dos Números</Label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {previewNumbers.sort((a, b) => a - b).map((num) => (
                    <div
                      key={num}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting || success}
            className="px-6"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || success}
            className="px-6 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'Salvando...' : success ? 'Salvo!' : 'Criar Estratégia'}
          </Button>
        </div>
      </div>
    </div>
  )
}
