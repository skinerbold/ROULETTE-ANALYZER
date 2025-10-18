'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { User, Lock, Mail, Eye, EyeOff, Sparkles } from 'lucide-react'
import styles from './AuthForm.module.css'

interface AuthFormProps {
  onLogin: (user: any) => void
}

export default function AuthForm({ onLogin }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('🔐 Tentando autenticação...', { email, isLogin })

    try {
      if (isLogin) {
        console.log('📧 Fazendo login com:', email)
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        console.log('🔍 Resposta do login:', { data, error })

        if (error) {
          console.error('❌ Erro de autenticação:', error)
          throw error
        }

        if (data.user) {
          console.log('✅ Login bem-sucedido!', data.user)
          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário'
          }
          onLogin(userData)
        }
      } else {
        console.log('📝 Criando conta com:', email)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name
            },
            emailRedirectTo: window.location.origin
          }
        })

        console.log('🔍 Resposta do cadastro:', { data, error })

        if (error) {
          console.error('❌ Erro no cadastro:', error)
          throw error
        }

        if (data.user) {
          console.log('✅ Cadastro bem-sucedido!', data.user)
          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: name || data.user.email?.split('@')[0] || 'Usuário'
          }
          onLogin(userData)
        }
      }
    } catch (error: any) {
      console.error('🔴 Erro capturado:', error)
      // Mensagens de erro mais amigáveis
      if (error.message?.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos. Verifique suas credenciais.')
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Email não confirmado. Verifique sua caixa de entrada.')
      } else if (error.message?.includes('User already registered')) {
        setError('Este email já está cadastrado. Tente fazer login.')
      } else {
        setError(error.message || 'Erro ao autenticar. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.authContainer} min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden`}>
      {/* Background decorativo com pattern CSS */}
      <div className={styles.backgroundPattern}></div>
      
      {/* Efeitos de luz */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>

      <Card className={`${styles.authCard} w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl relative z-10 my-4`}>
        {/* Header com padding generoso */}
        <CardHeader className="text-center px-6 sm:px-10 pt-8 sm:pt-10 pb-6 sm:pb-8">
          {/* Logo com animação */}
          <div className="relative mx-auto mb-6 sm:mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded-full animate-bounce"></div>
          </div>
          
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Roulette Analyzer
          </CardTitle>
          <p className="text-gray-300 text-base sm:text-lg font-medium">
            {isLogin ? 'Bem-vindo de volta!' : 'Junte-se a nós'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {isLogin ? 'Entre na sua conta para continuar' : 'Crie sua conta e comece a analisar'}
          </p>
        </CardHeader>
        
        {/* Conteúdo com padding generoso */}
        <CardContent className="px-6 sm:px-10 pb-8 sm:pb-10">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Campo Nome (apenas no cadastro) */}
            {!isLogin && (
              <div className="space-y-3 sm:space-y-4">
                <Label htmlFor="name" className="text-white text-sm sm:text-base font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 flex-shrink-0" />
                  Nome completo
                </Label>
                <div className="relative group">
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className={`${styles.authInput} w-full h-12 sm:h-14 pl-4 sm:pl-6 pr-4 sm:pr-6 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 rounded-xl transition-all duration-300 group-hover:bg-white/15 text-base`}
                    required={!isLogin}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
            )}
            
            {/* Campo Email */}
            <div className="space-y-3 sm:space-y-4">
              <Label htmlFor="email" className="text-white text-sm sm:text-base font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                Email
              </Label>
              <div className="relative group">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={`${styles.authInput} w-full h-12 sm:h-14 pl-4 sm:pl-6 pr-4 sm:pr-6 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 rounded-xl transition-all duration-300 group-hover:bg-white/15 text-base`}
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>
            
            {/* Campo Senha */}
            <div className="space-y-3 sm:space-y-4">
              <Label htmlFor="password" className="text-white text-sm sm:text-base font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 flex-shrink-0" />
                Senha
              </Label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className={`${styles.authInput} w-full h-12 sm:h-14 pl-4 sm:pl-6 pr-12 sm:pr-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 rounded-xl transition-all duration-300 group-hover:bg-white/15 text-base`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`${styles.authButton} absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200 p-1`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="p-3 sm:p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl">
                <p className="text-red-300 text-xs sm:text-sm text-center font-medium leading-relaxed">{error}</p>
              </div>
            )}

            {/* Botão de submit com espaçamento generoso */}
            <div className="pt-3 sm:pt-4">
              <Button
                type="submit"
                disabled={loading}
                className={`${styles.authButton} w-full h-12 sm:h-14 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white font-bold text-base sm:text-lg rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group active:scale-95`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {loading ? (
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processando...</span>
                  </div>
                ) : (
                  <span className="relative z-10">
                    {isLogin ? 'Entrar na Conta' : 'Criar Conta'}
                  </span>
                )}
              </Button>
            </div>
          </form>

          {/* Link de alternância com espaçamento generoso */}
          <div className="mt-8 sm:mt-10 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-400">ou</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsLogin(!isLogin)}
              className={`${styles.authToggle} mt-5 sm:mt-6 text-purple-300 hover:text-white text-sm sm:text-base font-semibold transition-all duration-200 hover:underline decoration-2 underline-offset-4 decoration-purple-400 active:scale-95`}
            >
              {isLogin 
                ? 'Não tem conta? Criar uma nova' 
                : 'Já tem conta? Fazer login'
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}