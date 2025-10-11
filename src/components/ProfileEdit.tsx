'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, User, Mail, Save } from 'lucide-react'

interface ProfileEditProps {
  user: any
  onClose: () => void
  onUpdate: (user: any) => void
}

export default function ProfileEdit({ user, onClose, onUpdate }: ProfileEditProps) {
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updatedUser = {
        ...user,
        name,
        email
      }
      
      localStorage.setItem('user', JSON.stringify(updatedUser))
      onUpdate(updatedUser)
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <Card className="w-full max-w-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-2xl">
        {/* CORREÇÃO: Padding aumentado significativamente no header */}
        <CardHeader className="flex flex-row items-center justify-between px-8 pt-8 pb-6">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Editar Perfil
          </CardTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        
        {/* CORREÇÃO: Padding aumentado significativamente no conteúdo */}
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-gray-700 dark:text-gray-300 font-medium">
                Nome completo
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="pl-12 pr-4 py-3 h-12 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all duration-200"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-12 pr-4 py-3 h-12 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* CORREÇÃO: Espaçamento aumentado entre campos e botões */}
            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 h-12 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-all duration-200"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}