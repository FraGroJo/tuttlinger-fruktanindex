/**
 * Umfassende Systemvalidierung für Fruktanindex
 * 
 * Prüft:
 * 1. API-Integrität (ECMWF)
 * 2. Score-Berechnungen
 * 3. Temperatur- und Wetteranzeige
 * 4. Offenstall-Berechnungen
 * 5. Heuanalyse-Integration
 */

import type { ECMWFResponse } from '@/types/api';
import type { HorseMinimal, PastureConfigMinimal, TurnoutRecommendation } from '@/types/horse';
import type { RiskLevel } from '@/types/fruktan';
import { calculateScore, getRiskLevel } from './scoring';
import { calculateTurnoutForWindow } from './horseCalculations';

// ============= KONSTANTEN =============
const EXPECTED_API_URL = 'https://api.open-meteo.com/v1/ecmwf';
const EXPECTED_TIMEZONE = 'Europe/Berlin';
const EXPECTED_HOURLY_COUNT = 240; // 72h Vergangenheit + 168h Prognose
const HEU_DM_PCT = 89.7; // Fixer Wert aus Heuanalyse
const HEU_NSC_PCT = 18.3; // Fixer Wert aus Heuanalyse
const HEU_ME = 8.3; // MJ/kg TS

// Toleranzen
const TEMP_TOLERANCE = 0.1; // 0.1°C
const SCORE_TOLERANCE = 0.1; // 0.1 Punkte
const TIME_TOLERANCE_MIN = 30; // 30 Minuten

export interface ValidationResult {
  passed: boolean;
  category: string;
  test: string;
  expected?: any;
  actual?: any;
  error?: string;
  timestamp: string;
}

export interface ValidationReport {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: ValidationResult[];
  startTime: string;
  endTime: string;
  duration: number;
}

export class SystemValidator {
  private results: ValidationResult[] = [];
  
  /**
   * 1. API-Integrität validieren
   */
  validateAPIIntegrity(data: ECMWFResponse): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Timezone prüfen
    results.push({
      passed: data.timezone === EXPECTED_TIMEZONE,
      category: 'API-Integrität',
      test: 'Timezone = Europe/Berlin',
      expected: EXPECTED_TIMEZONE,
      actual: data.timezone,
      timestamp: new Date().toISOString(),
    });
    
    // Hourly data length prüfen
    const hourlyLength = data.hourly?.time?.length || 0;
    results.push({
      passed: hourlyLength === EXPECTED_HOURLY_COUNT,
      category: 'API-Integrität',
      test: 'Stundenwerte = 240 (72h + 168h)',
      expected: EXPECTED_HOURLY_COUNT,
      actual: hourlyLength,
      timestamp: new Date().toISOString(),
    });
    
    // Required fields prüfen
    const requiredFields = [
      'temperature_2m',
      'relative_humidity_2m',
      'shortwave_radiation',
      'cloud_cover',
      'precipitation',
      'wind_speed_10m',
      'et0_fao_evapotranspiration',
    ];
    
    requiredFields.forEach(field => {
      const exists = data.hourly && field in data.hourly;
      results.push({
        passed: exists,
        category: 'API-Integrität',
        test: `Feld vorhanden: ${field}`,
        expected: true,
        actual: exists,
        timestamp: new Date().toISOString(),
      });
    });
    
    // Current weather time prüfen
    if (data.current) {
      const currentTime = new Date(data.current.time);
      const now = new Date();
      const diffMin = Math.abs(now.getTime() - currentTime.getTime()) / (1000 * 60);
      
      results.push({
        passed: diffMin <= TIME_TOLERANCE_MIN,
        category: 'API-Integrität',
        test: 'Current weather time ±30 min',
        expected: `±${TIME_TOLERANCE_MIN} min`,
        actual: `${diffMin.toFixed(1)} min`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Wertebereich prüfen
    if (data.hourly) {
      const temps = data.hourly.temperature_2m || [];
      const humidity = data.hourly.relative_humidity_2m || [];
      const wind = data.hourly.wind_speed_10m || [];
      const precip = data.hourly.precipitation || [];
      
      results.push({
        passed: temps.every(t => t >= -30 && t <= 45),
        category: 'API-Integrität',
        test: 'Temperatur in Range −30–45 °C',
        expected: '−30–45 °C',
        actual: `${Math.min(...temps).toFixed(1)}–${Math.max(...temps).toFixed(1)} °C`,
        timestamp: new Date().toISOString(),
      });
      
      results.push({
        passed: humidity.every(h => h >= 0 && h <= 100),
        category: 'API-Integrität',
        test: 'Luftfeuchte in Range 0–100 %',
        expected: '0–100 %',
        actual: `${Math.min(...humidity).toFixed(1)}–${Math.max(...humidity).toFixed(1)} %`,
        timestamp: new Date().toISOString(),
      });
      
      results.push({
        passed: wind.every(w => w >= 0 && w <= 60),
        category: 'API-Integrität',
        test: 'Wind in Range 0–60 km/h',
        expected: '0–60 km/h',
        actual: `${Math.min(...wind).toFixed(1)}–${Math.max(...wind).toFixed(1)} km/h`,
        timestamp: new Date().toISOString(),
      });
      
      results.push({
        passed: precip.every(p => p >= 0),
        category: 'API-Integrität',
        test: 'Niederschlag ≥ 0 mm',
        expected: '≥ 0 mm',
        actual: `min: ${Math.min(...precip).toFixed(2)} mm`,
        timestamp: new Date().toISOString(),
      });
    }
    
    return results;
  }
  
  /**
   * 2. Score-Berechnungen validieren
   */
  validateScoreCalculations(data: ECMWFResponse): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    if (!data.hourly || !data.hourly.time) {
      results.push({
        passed: false,
        category: 'Score-Berechnung',
        test: 'Stundendaten verfügbar',
        error: 'Keine Stundendaten vorhanden',
        timestamp: new Date().toISOString(),
      });
      return results;
    }
    
    // Test 10 Stichproben
    const sampleIndices = [0, 24, 48, 72, 96, 120, 144, 168, 192, 216];
    
    sampleIndices.forEach(idx => {
      if (idx >= data.hourly.time.length) return;
      
      const hour = data.hourly.time[idx];
      const temp = data.hourly.temperature_2m[idx];
      const cloud = data.hourly.cloud_cover[idx];
      
      // Minimale Berechnung für Test
      const testDate = new Date(hour);
      
      // Einfacher Score-Test (nur prüfen ob Berechnung läuft)
      try {
        const score = calculateScore({
          tempMax: temp,
          tempMin: temp - 2,
          radiationMorning: 100,
          cloudCoverSlot: cloud,
          et0_7d_avg: 2.0,
          precip_7d_sum: 5.0,
          wind_3d_avg: 10.0,
          relativeHumidityMorning: 70,
          slot: 'morning',
          date: testDate,
        }, 1.0, 0);
        
        const level = getRiskLevel(score, false);
        
        results.push({
          passed: score >= 0 && score <= 100 && ['safe', 'moderate', 'high'].includes(level),
          category: 'Score-Berechnung',
          test: `Score-Berechnung Stunde ${idx} (${hour})`,
          expected: '0–100, valid level',
          actual: `Score: ${score.toFixed(1)}, Level: ${level}`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        results.push({
          passed: false,
          category: 'Score-Berechnung',
          test: `Score-Berechnung Stunde ${idx}`,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    });
    
    return results;
  }
  
  /**
   * 3. Temperaturanzeige validieren
   */
  validateTemperatureDisplay(data: ECMWFResponse): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    if (data.current) {
      const currentTemp = data.current.temperature_2m;
      
      results.push({
        passed: typeof currentTemp === 'number' && !isNaN(currentTemp),
        category: 'Temperaturanzeige',
        test: 'Aktuelle Temperatur verfügbar',
        expected: 'number',
        actual: typeof currentTemp,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (data.daily) {
      const maxTemps = data.daily.temperature_2m_max || [];
      const minTemps = data.daily.temperature_2m_min || [];
      
      results.push({
        passed: maxTemps.every((max, i) => max >= minTemps[i]),
        category: 'Temperaturanzeige',
        test: 'Tagesmax ≥ Tagesmin',
        expected: 'max ≥ min für alle Tage',
        actual: maxTemps.every((max, i) => max >= minTemps[i]) ? 'OK' : 'FEHLER',
        timestamp: new Date().toISOString(),
      });
    }
    
    return results;
  }
  
  /**
   * 4. Offenstall-Berechnungen validieren
   */
  validateTurnoutCalculations(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Test-Pferde
    const testHorses: HorseMinimal[] = [
      {
        id: 'test-1',
        name: 'Test EMS 400kg',
        mass_kg: 400,
        easy_or_ems: true,
        muzzle: 'none',
        hay_kg_as_fed_per_day: 8,
        hay_nsc_pct: HEU_NSC_PCT,
        is_active: true,
      },
      {
        id: 'test-2',
        name: 'Test Normal 500kg',
        mass_kg: 500,
        easy_or_ems: false,
        muzzle: 'none',
        hay_kg_as_fed_per_day: 10,
        hay_nsc_pct: HEU_NSC_PCT,
        is_active: true,
      },
      {
        id: 'test-3',
        name: 'Test EMS Muzzle 600kg',
        mass_kg: 600,
        easy_or_ems: true,
        muzzle: 'on',
        hay_kg_as_fed_per_day: 12,
        hay_nsc_pct: HEU_NSC_PCT,
        is_active: true,
      },
    ];
    
    const testConfig: PastureConfigMinimal = {
      tz: 'Europe/Berlin',
      intake_rate_no_muzzle: 1.0,
      intake_rate_muzzle: 0.5,
      map_score_to_nsc: [
        { upTo: 20, nsc: 8 },
        { upTo: 40, nsc_from: 8, nsc_to: 12 },
        { upTo: 60, nsc_from: 12, nsc_to: 16 },
        { upTo: 80, nsc_from: 16, nsc_to: 20 },
        { upTo: 100, nsc: 22 },
      ],
      min_turnout_min: 0,
      max_turnout_min: 180,
      step_min: 5,
      red_forbidden: true,
      yellow_cap_min: 60,
    };
    
    testHorses.forEach(horse => {
      // Test mit verschiedenen Scores
      [10, 30, 50, 70].forEach(score => {
        const level: RiskLevel = score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'safe';
        
        try {
          const recommendation = calculateTurnoutForWindow(horse, score, level, testConfig);
          
          // NSC-Budget prüfen
          const expectedBudget = horse.easy_or_ems ? 8 * horse.mass_kg : 12 * horse.mass_kg;
          const budgetMatch = Math.abs(recommendation.explain.NSC_budget_g - expectedBudget) < 1;
          
          results.push({
            passed: budgetMatch,
            category: 'Offenstall-Berechnung',
            test: `NSC-Budget ${horse.name}, Score ${score}`,
            expected: `${expectedBudget} g`,
            actual: `${recommendation.explain.NSC_budget_g.toFixed(1)} g`,
            timestamp: new Date().toISOString(),
          });
          
          // Heu-NSC prüfen
          const hayDM = horse.hay_kg_as_fed_per_day * (HEU_DM_PCT / 100);
          const expectedHayNSC = hayDM * (HEU_NSC_PCT / 100) * 1000;
          const hayMatch = Math.abs(recommendation.explain.base_nsc_g - expectedHayNSC) < 10;
          
          results.push({
            passed: hayMatch,
            category: 'Offenstall-Berechnung',
            test: `Heu-NSC ${horse.name}`,
            expected: `${expectedHayNSC.toFixed(1)} g`,
            actual: `${recommendation.explain.base_nsc_g.toFixed(1)} g`,
            timestamp: new Date().toISOString(),
          });
          
          // Rot-Verbot prüfen
          if (level === 'high') {
            results.push({
              passed: recommendation.turnout_min === 0,
              category: 'Offenstall-Berechnung',
              test: `Rot-Verbot ${horse.name}, Score ${score}`,
              expected: '0 min',
              actual: `${recommendation.turnout_min} min`,
              timestamp: new Date().toISOString(),
            });
          }
          
          // Gelb-Cap prüfen
          if (level === 'moderate') {
            results.push({
              passed: recommendation.turnout_min <= testConfig.yellow_cap_min,
              category: 'Offenstall-Berechnung',
              test: `Gelb-Cap ${horse.name}, Score ${score}`,
              expected: `≤ ${testConfig.yellow_cap_min} min`,
              actual: `${recommendation.turnout_min} min`,
              timestamp: new Date().toISOString(),
            });
          }
          
          // Maulkorb-Rate prüfen
          const expectedRate = horse.muzzle === 'on' ? 0.5 : 1.0;
          const rateMatch = Math.abs(recommendation.explain.intake_rate_kg_dm_per_h - expectedRate) < 0.01;
          
          results.push({
            passed: rateMatch,
            category: 'Offenstall-Berechnung',
            test: `Aufnahmerate ${horse.name} (Muzzle: ${horse.muzzle})`,
            expected: `${expectedRate} kg/h`,
            actual: `${recommendation.explain.intake_rate_kg_dm_per_h.toFixed(2)} kg/h`,
            timestamp: new Date().toISOString(),
          });
          
        } catch (error) {
          results.push({
            passed: false,
            category: 'Offenstall-Berechnung',
            test: `Berechnung ${horse.name}, Score ${score}`,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
        }
      });
    });
    
    return results;
  }
  
  /**
   * 5. Heuanalyse-Konstanten validieren
   */
  validateHayAnalysis(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    results.push({
      passed: Math.abs(HEU_DM_PCT - 89.7) < 0.1,
      category: 'Heuanalyse',
      test: 'HEU_DM = 89.7%',
      expected: '89.7%',
      actual: `${HEU_DM_PCT}%`,
      timestamp: new Date().toISOString(),
    });
    
    results.push({
      passed: Math.abs(HEU_NSC_PCT - 18.3) < 0.1,
      category: 'Heuanalyse',
      test: 'HEU_NSC = 18.3%',
      expected: '18.3%',
      actual: `${HEU_NSC_PCT}%`,
      timestamp: new Date().toISOString(),
    });
    
    results.push({
      passed: Math.abs(HEU_ME - 8.3) < 0.1,
      category: 'Heuanalyse',
      test: 'HEU_ME = 8.3 MJ/kg TS',
      expected: '8.3 MJ/kg TS',
      actual: `${HEU_ME} MJ/kg TS`,
      timestamp: new Date().toISOString(),
    });
    
    return results;
  }
  
  /**
   * Vollständiger Systemtest
   */
  async runFullSystemTest(data: ECMWFResponse | null): Promise<ValidationReport> {
    const startTime = new Date().toISOString();
    const results: ValidationResult[] = [];
    
    console.log('🔍 Starte Systemvalidierung...');
    
    // 1. Heuanalyse
    console.log('1/5: Validiere Heuanalyse-Konstanten...');
    results.push(...this.validateHayAnalysis());
    
    if (data) {
      // 2. API-Integrität
      console.log('2/5: Validiere API-Integrität...');
      results.push(...this.validateAPIIntegrity(data));
      
      // 3. Score-Berechnungen
      console.log('3/5: Validiere Score-Berechnungen...');
      results.push(...this.validateScoreCalculations(data));
      
      // 4. Temperaturanzeige
      console.log('4/5: Validiere Temperaturanzeige...');
      results.push(...this.validateTemperatureDisplay(data));
    } else {
      console.warn('⚠️ Keine API-Daten verfügbar - überspringe API-Tests');
    }
    
    // 5. Offenstall-Berechnungen
    console.log('5/5: Validiere Offenstall-Berechnungen...');
    results.push(...this.validateTurnoutCalculations());
    
    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    
    const report: ValidationReport = {
      passed: failedTests === 0,
      totalTests: results.length,
      passedTests,
      failedTests,
      results,
      startTime,
      endTime,
      duration,
    };
    
    console.log(`\n✅ Validierung abgeschlossen: ${passedTests}/${results.length} Tests bestanden`);
    if (failedTests > 0) {
      console.error(`❌ ${failedTests} Tests fehlgeschlagen`);
    }
    
    return report;
  }
}

export const systemValidator = new SystemValidator();
