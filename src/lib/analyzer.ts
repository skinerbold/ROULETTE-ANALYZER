import { Strategy, AnalysisResult, Activation, NumberResult } from './types';
import { getStrategyNumbers } from './strategies';

export class RouletteAnalyzer {
  private strategy: Strategy;
  private numbers: number[];

  constructor(strategy: Strategy, numbers: number[]) {
    this.strategy = strategy;
    this.numbers = numbers;
  }

  analyze(): AnalysisResult {
    const activations: Activation[] = [];
    const numberResults: NumberResult[] = [];
    
    let currentActivation: Activation | null = null;
    let attemptsCount = 0;
    
    for (let i = 0; i < this.numbers.length; i++) {
      const currentNumber = this.numbers[i];
      
      // Pega os números restantes ANTES do atual para estratégias dinâmicas
      const previousNumbers = this.numbers.slice(0, i);
      const strategyNumbers = getStrategyNumbers(this.strategy.id, previousNumbers);
      
      // Se não há ativação atual, verifica se o número ativa a estratégia
      if (!currentActivation) {
        if (strategyNumbers.includes(currentNumber)) {
          // Estratégia ativada
          currentActivation = {
            position: i,
            activatingNumber: currentNumber,
            result: 'RED', // Inicialmente RED, pode mudar para GREEN
            attempts: 0
          };
          
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'ACTIVATION',
            strategyId: this.strategy.id
          });
          
          attemptsCount = 0;
        } else {
          // Número neutro
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'NEUTRAL'
          });
        }
      } else {
        // Há uma ativação em andamento
        attemptsCount++;
        currentActivation.attempts = attemptsCount;
        
        // Recalcula os números da estratégia para checagem (pode ter mudado dinamicamente)
        const checkNumbers = getStrategyNumbers(this.strategy.id, previousNumbers);
        const allNumbers = [
          ...checkNumbers,
          ...(this.strategy.protectionNumbers || [])
        ];
        
        if (allNumbers.includes(currentNumber)) {
          // GREEN - acertou
          currentActivation.result = 'GREEN';
          currentActivation.winningNumber = currentNumber;
          
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'GREEN',
            strategyId: this.strategy.id
          });
          
          activations.push(currentActivation);
          currentActivation = null;
          attemptsCount = 0;
        } else if (attemptsCount >= 3) {
          // RED - não acertou em 3 tentativas
          currentActivation.result = 'RED';
          
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'RED',
            strategyId: this.strategy.id
          });
          
          activations.push(currentActivation);
          currentActivation = null;
          attemptsCount = 0;
        } else {
          // Continua tentando
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'NEUTRAL'
          });
        }
      }
    }
    
    // Se terminou com uma ativação em andamento, considera como RED
    if (currentActivation) {
      currentActivation.result = 'RED';
      activations.push(currentActivation);
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
    
    // Calcular tentativas
    const greenActivations = activations.filter(a => a.result === 'GREEN');
    const firstAttemptHits = greenActivations.filter(a => a.attempts === 1).length;
    const secondAttemptHits = greenActivations.filter(a => a.attempts === 2).length;
    const thirdAttemptHits = greenActivations.filter(a => a.attempts === 3).length;
    
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
    
    return {
      strategyId: this.strategy.id,
      totalGreen,
      totalRed,
      maxGreenSequence,
      maxRedSequence,
      firstAttemptHits,
      secondAttemptHits,
      thirdAttemptHits,
      mostActivatingNumber,
      mostActivatingCount,
      activations
    };
  }

  getNumberResults(): NumberResult[] {
    // Reanalisa para obter os resultados dos números
    const activations: Activation[] = [];
    const numberResults: NumberResult[] = [];
    
    let currentActivation: Activation | null = null;
    let attemptsCount = 0;
    
    for (let i = 0; i < this.numbers.length; i++) {
      const currentNumber = this.numbers[i];
      
      // Pega os números restantes ANTES do atual para estratégias dinâmicas
      const previousNumbers = this.numbers.slice(0, i);
      const strategyNumbers = getStrategyNumbers(this.strategy.id, previousNumbers);
      
      if (!currentActivation) {
        if (strategyNumbers.includes(currentNumber)) {
          currentActivation = {
            position: i,
            activatingNumber: currentNumber,
            result: 'RED',
            attempts: 0
          };
          
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'ACTIVATION',
            strategyId: this.strategy.id
          });
          
          attemptsCount = 0;
        } else {
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'NEUTRAL'
          });
        }
      } else {
        attemptsCount++;
        currentActivation.attempts = attemptsCount;
        
        // Recalcula os números da estratégia para checagem (pode ter mudado dinamicamente)
        const checkNumbers = getStrategyNumbers(this.strategy.id, previousNumbers);
        const allNumbers = [
          ...checkNumbers,
          ...(this.strategy.protectionNumbers || [])
        ];
        
        if (allNumbers.includes(currentNumber)) {
          currentActivation.result = 'GREEN';
          currentActivation.winningNumber = currentNumber;
          
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'GREEN',
            strategyId: this.strategy.id
          });
          
          activations.push(currentActivation);
          currentActivation = null;
          attemptsCount = 0;
        } else if (attemptsCount >= 3) {
          currentActivation.result = 'RED';
          
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'RED',
            strategyId: this.strategy.id
          });
          
          activations.push(currentActivation);
          currentActivation = null;
          attemptsCount = 0;
        } else {
          numberResults.push({
            number: currentNumber,
            position: i,
            status: 'NEUTRAL'
          });
        }
      }
    }
    
    return numberResults;
  }
}

// Função utilitária para análise rápida - compatibilidade com o código existente
export function analyzeNumbers(numbers: number[], strategy: Strategy): AnalysisResult {
  const analyzer = new RouletteAnalyzer(strategy, numbers);
  return analyzer.analyze();
}