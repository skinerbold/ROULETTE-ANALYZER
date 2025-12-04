import { Strategy, AnalysisResult, Activation, NumberResult } from './types';
import { getStrategyNumbers } from './strategies';

// ========================================
// ANALISADOR DE ESTRATÉGIAS - REESCRITO DO ZERO
// ========================================
// 
// Este analisador processa números da roleta e identifica:
// - ACTIVATIONS: Quando um número da estratégia aparece
// - GREENS: Quando um número da estratégia aparece dentro do intervalo pós-activation
// - REDS: Quando o intervalo se esgota sem acerto
//
// IMPORTANTE: O array de números é processado do índice 0 ao N, onde:
// - Para análise de cores na tela: índice 0 = mais recente
// - Para este analyzer de estatísticas: índice 0 = mais antigo (ordem cronológica)
// ========================================

export interface AnalyzerOptions {
  maxAttempts: number; // Número de casas para verificar (1-6)
}

export class RouletteAnalyzer {
  private strategy: Strategy;
  private numbers: number[];
  private maxAttempts: number;

  constructor(strategy: Strategy, numbers: number[], options?: AnalyzerOptions) {
    this.strategy = strategy;
    this.numbers = numbers;
    this.maxAttempts = options?.maxAttempts ?? 3; // Padrão: 3 tentativas
  }

  /**
   * Analisa os números e retorna estatísticas completas
   * O array de números deve estar em ordem cronológica (índice 0 = mais antigo)
   */
  analyze(): AnalysisResult {
    const activations: Activation[] = [];
    
    // Obter números da estratégia
    const strategyNumbers = getStrategyNumbers(this.strategy.id, this.numbers);
    const strategySet = new Set(strategyNumbers);
    
    // Índice até onde já processamos (evita sobreposição de janelas)
    let i = 0;
    
    while (i < this.numbers.length) {
      const currentNumber = this.numbers[i];
      
      // Verificar se é número da estratégia (potencial ACTIVATION)
      if (strategySet.has(currentNumber)) {
        // ACTIVATION encontrada
        const activation: Activation = {
          position: i,
          activatingNumber: currentNumber,
          result: 'RED', // Assume RED até encontrar GREEN
          attempts: 0
        };
        
        // Verificar as próximas maxAttempts casas
        let foundGreen = false;
        
        for (let j = 1; j <= this.maxAttempts; j++) {
          const checkIndex = i + j;
          
          // Se não há mais números, para
          if (checkIndex >= this.numbers.length) {
            break;
          }
          
          const checkNumber = this.numbers[checkIndex];
          activation.attempts = j;
          
          // Verificar se é número da estratégia
          if (strategySet.has(checkNumber)) {
            // GREEN encontrado
            activation.result = 'GREEN';
            activation.winningNumber = checkNumber;
            foundGreen = true;
            
            // Avançar i para depois do GREEN
            i = checkIndex;
            break;
          }
        }
        
        // Se não encontrou GREEN, o resultado permanece RED
        // e avançamos i para depois da janela verificada
        if (!foundGreen) {
          // Avançar para a próxima posição após a janela
          i = i + this.maxAttempts;
        }
        
        activations.push(activation);
      }
      
      i++;
    }
    
    return this.calculateStatistics(activations);
  }

  private calculateStatistics(activations: Activation[]): AnalysisResult {
    const totalGreen = activations.filter(a => a.result === 'GREEN').length;
    const totalRed = activations.filter(a => a.result === 'RED').length;
    
    // Calcular sequências máximas
    let maxGreenSequence = 0;
    let maxRedSequence = 0;
    let currentGreenSequence = 0;
    let currentRedSequence = 0;
    
    for (const activation of activations) {
      if (activation.result === 'GREEN') {
        currentGreenSequence++;
        currentRedSequence = 0;
        maxGreenSequence = Math.max(maxGreenSequence, currentGreenSequence);
      } else {
        currentRedSequence++;
        currentGreenSequence = 0;
        maxRedSequence = Math.max(maxRedSequence, currentRedSequence);
      }
    }
    
    // Calcular acertos por tentativa
    const greenActivations = activations.filter(a => a.result === 'GREEN');
    const firstAttemptHits = greenActivations.filter(a => a.attempts === 1).length;
    const secondAttemptHits = greenActivations.filter(a => a.attempts === 2).length;
    const thirdAttemptHits = greenActivations.filter(a => a.attempts === 3).length;
    const fourthAttemptHits = greenActivations.filter(a => a.attempts === 4).length;
    const fifthAttemptHits = greenActivations.filter(a => a.attempts === 5).length;
    const sixthAttemptHits = greenActivations.filter(a => a.attempts === 6).length;
    
    // Calcular número que mais ativou
    const activatingNumbers: { [key: number]: number } = {};
    for (const activation of activations) {
      activatingNumbers[activation.activatingNumber] = 
        (activatingNumbers[activation.activatingNumber] || 0) + 1;
    }
    
    let mostActivatingNumber = 0;
    let mostActivatingCount = 0;
    for (const [number, count] of Object.entries(activatingNumbers)) {
      if (count > mostActivatingCount) {
        mostActivatingCount = count;
        mostActivatingNumber = parseInt(number);
      }
    }
    
    // Calcular profit (greens - reds)
    const profit = totalGreen - totalRed;
    
    // Calcular winRate
    const totalActivations = activations.length;
    const winRate = totalActivations > 0 ? (totalGreen / totalActivations) * 100 : 0;
    
    return {
      totalGreen,
      totalRed,
      maxGreenSequence,
      maxRedSequence,
      firstAttemptHits,
      secondAttemptHits,
      thirdAttemptHits,
      fourthAttemptHits,
      fifthAttemptHits,
      sixthAttemptHits,
      mostActivatingNumber,
      mostActivatingCount,
      profit,
      activations,
      winRate
    };
  }

  /**
   * Retorna o status de cada número (para pintura na tela)
   * NOTA: Para a tela, use a função updateNumberStatuses no page.tsx
   * que processa do mais recente para o mais antigo
   */
  getNumberResults(): NumberResult[] {
    const numberResults: NumberResult[] = [];
    const strategyNumbers = getStrategyNumbers(this.strategy.id, this.numbers);
    const strategySet = new Set(strategyNumbers);
    
    // Array de status - todos começam NEUTRAL
    const statusArray: ('GREEN' | 'RED' | 'ACTIVATION' | 'NEUTRAL')[] = 
      new Array(this.numbers.length).fill('NEUTRAL');
    
    let i = 0;
    
    while (i < this.numbers.length) {
      const currentNumber = this.numbers[i];
      
      if (strategySet.has(currentNumber) && statusArray[i] === 'NEUTRAL') {
        // ACTIVATION
        statusArray[i] = 'ACTIVATION';
        
        // Verificar janela
        let foundGreen = false;
        
        for (let j = 1; j <= this.maxAttempts; j++) {
          const checkIndex = i + j;
          
          if (checkIndex >= this.numbers.length) break;
          
          const checkNumber = this.numbers[checkIndex];
          
          if (strategySet.has(checkNumber)) {
            statusArray[checkIndex] = 'GREEN';
            foundGreen = true;
            i = checkIndex;
            break;
          }
        }
        
        // Marcar RED na última casa se não encontrou GREEN
        if (!foundGreen) {
          const redIndex = i + this.maxAttempts;
          if (redIndex < this.numbers.length && statusArray[redIndex] === 'NEUTRAL') {
            statusArray[redIndex] = 'RED';
          }
          i = i + this.maxAttempts;
        }
      }
      
      i++;
    }
    
    // Converter para NumberResult
    for (let idx = 0; idx < this.numbers.length; idx++) {
      numberResults.push({
        number: this.numbers[idx],
        position: idx,
        status: statusArray[idx],
        strategyId: this.strategy.id
      });
    }
    
    return numberResults;
  }
}

// Função utilitária para análise rápida
export function analyzeNumbers(
  numbers: number[], 
  strategy: Strategy, 
  maxAttempts: number = 3
): AnalysisResult {
  const analyzer = new RouletteAnalyzer(strategy, numbers, { maxAttempts });
  return analyzer.analyze();
}

// Exportar interface de resultado estendida
export interface ExtendedAnalysisResult extends AnalysisResult {
  fourthAttemptHits: number;
  fifthAttemptHits: number;
  sixthAttemptHits: number;
  winRate: number;
}