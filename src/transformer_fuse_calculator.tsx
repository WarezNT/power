import React, { useState, useMemo } from 'react';
import { Calculator, Zap, Info, AlertTriangle } from 'lucide-react';

// Type definitions
interface CableData {
  current: number;
  description: string;
  type: string;
}

interface CableTypeData {
  [section: string]: CableData;
}

interface CableDatabase {
  NFA2X: CableTypeData;
  NA2XABY: CableTypeData;
}

interface Departure {
  id: number;
  cableType: keyof CableDatabase;
  section: string;
  material: string;
  manualFuse: number | null;
  realCurrent?: number | null; // Curent real în A din altă aplicație (opțional)
}

const TransformerFuseCalculator = () => {
  const [powerKVA, setPowerKVA] = useState(400);
  const [primaryVoltage, setPrimaryVoltage] = useState(20);
  const [secondaryVoltage, setSecondaryVoltage] = useState(0.4);
  const [powerFactor, setPowerFactor] = useState(0.9);
  const [generalFuseFactor, setGeneralFuseFactor] = useState(1.0);
  const [useRealCurrent, setUseRealCurrent] = useState(false); // Mod calcul: false = automat, true = curent real
  const [departures, setDepartures] = useState<Departure[]>([
    { id: 1, cableType: 'NFA2X', section: '3x50+25', material: 'AL', manualFuse: null, realCurrent: null }
  ]);

  // Date cabluri și conductoare din aluminiu - Valori reale din cataloage Romania
  const cableData: CableDatabase = {
    'NFA2X': {
      // Conductoare torsadate aeriene - secțiuni extinse
      '50+3x50': { current: 160, description: '50+3x50 mm²', type: 'Torsadat aerian' },
      '50+3x70': { current: 200, description: '50+3x70 mm²', type: 'Torsadat aerian' },
      '50+3x95': { current: 245, description: '50+3x95 mm²', type: 'Torsadat aerian' },
      '3x50+25': { current: 160, description: '3x50+25 mm²', type: 'Torsadat aerian' },
      '3x70+35': { current: 200, description: '3x70+35 mm²', type: 'Torsadat aerian' },
      '3x95+50': { current: 245, description: '3x95+50 mm²', type: 'Torsadat aerian' }
    },
    'NA2XABY': {
      // Cabluri subterane armate - date conform fișe tehnice Romania
      '3x25+16': { current: 105, description: '3x25+16 mm²', type: 'Subteran armat' },
      '3x35+16': { current: 130, description: '3x35+16 mm²', type: 'Subteran armat' },
      '3x50+25': { current: 160, description: '3x50+25 mm²', type: 'Subteran armat' },
      '3x70+35': { current: 200, description: '3x70+35 mm²', type: 'Subteran armat' },
      '3x95+50': { current: 245, description: '3x95+50 mm²', type: 'Subteran armat' },
      '3x120+70': { current: 285, description: '3x120+70 mm²', type: 'Subteran armat' },
      '3x150+70': { current: 325, description: '3x150+70 mm²', type: 'Subteran armat' },
      '3x185+95': { current: 370, description: '3x185+95 mm²', type: 'Subteran armat' },
      '3x240+120': { current: 435, description: '3x240+120 mm²', type: 'Subteran armat' }
    }
  };

  // Puteri transformatoare disponibile
  const transformerPowers = [50, 63, 100, 160, 250, 400, 630, 1000];

  // Serii normalizate de siguranțe conform IEC/SR
  const fuseSeriesLV = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250];
  const fuseSeriesMV = [6.3, 10, 16, 20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200];

  // Calcule conform practici inginerești din România
  const calculations = useMemo(() => {
    // Curent primar (MT) - formula standard
    const primaryCurrent = (powerKVA * 1000) / (Math.sqrt(3) * primaryVoltage * 1000);
    
    // Curent secundar nominal (JT) - cu factor de putere
    const secondaryCurrent = (powerKVA * 1000) / (Math.sqrt(3) * secondaryVoltage * 1000 * powerFactor);
    
    // Siguranță MT: 
    // Practica uzuală în România: (2.0 - 2.5) x In primar pentru protecție transformator
    // Se folosește 2.0 pentru transformatoare mici-medii
    const mvFuseCalc = primaryCurrent * 2.0;
    const mvFuse = fuseSeriesMV.find(f => f >= mvFuseCalc) || fuseSeriesMV[fuseSeriesMV.length - 1];
    
    // Siguranță general trafo (JT):
    // Factor selectabil conform brosură (0.8-1.6 x In secundar)
    const generalFuseCalc = secondaryCurrent * generalFuseFactor;
    const generalFuse = fuseSeriesLV.find(f => f >= generalFuseCalc) || fuseSeriesLV[fuseSeriesLV.length - 1];
    
    return {
      primaryCurrent: primaryCurrent.toFixed(2),
      secondaryCurrent: secondaryCurrent.toFixed(2),
      mvFuse,
      mvFuseCalc: mvFuseCalc.toFixed(2),
      generalFuse,
      generalFuseCalc: generalFuseCalc.toFixed(2)
    };
  }, [powerKVA, primaryVoltage, secondaryVoltage, powerFactor, generalFuseFactor]);

  const addDeparture = () => {
    setDepartures([
      ...departures,
      { id: Date.now(), cableType: 'NFA2X', section: '3x50+25', material: 'AL', manualFuse: null, realCurrent: null }
    ]);
  };

  const removeDeparture = (id: number) => {
    setDepartures(departures.filter((d: Departure) => d.id !== id));
  };

  const updateDeparture = (id: number, field: keyof Departure, value: any) => {
    setDepartures(departures.map((d: Departure) => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

interface FuseCalculationResult {
  fuse: number | '-';
  autoFuse: number | '-';
  admissible: number | '-';
  calc: string | '-';
  type: string | '-';
}

  const calculateDepartureFuse = (cableType: keyof CableDatabase, section: string, manualFuse: number | null = null): FuseCalculationResult => {
    const cable = cableData[cableType]?.[section];
    if (!cable) return { fuse: '-', admissible: '-', calc: '-', type: '-', autoFuse: '-' };
    
    // Siguranță automată: protecție cablu
    // Criteriu: In_siguranta ≤ Iz (curent admisibil)
    const autoFuse = fuseSeriesLV.filter(f => f <= cable.current).pop() || fuseSeriesLV[0];
    
    // Dacă există siguranță manuală, o folosim, altfel pe cea automată
    const selectedFuse = manualFuse !== null ? manualFuse : autoFuse;
    
    return {
      fuse: selectedFuse,
      autoFuse: autoFuse,
      admissible: cable.current,
      calc: (cable.current * 0.9).toFixed(2),
      type: cable.type
    };
  };

  // Calcul grad de încărcare transformator
  const loadingAnalysis = useMemo(() => {
    const totalCurrent = departures.reduce((sum: number, dep: Departure) => {
      if (useRealCurrent && dep.realCurrent !== null && dep.realCurrent !== undefined) {
        // Folosim curentul real introdus manual
        return sum + dep.realCurrent;
      } else {
        // Folosim calculul automat pe baza siguranțelor
        const fuseData = calculateDepartureFuse(dep.cableType, dep.section, dep.manualFuse);
        return sum + (typeof fuseData.fuse === 'number' ? fuseData.fuse : 0);
      }
    }, 0);
    
    const secondaryCurrent = parseFloat(calculations.secondaryCurrent);
    const loadingPercentage = (totalCurrent / secondaryCurrent) * 100;
    const isOverloaded = totalCurrent > secondaryCurrent;
    
    return {
      totalCurrent: totalCurrent.toFixed(2),
      loadingPercentage: loadingPercentage.toFixed(1),
      isOverloaded,
      availableCurrent: (secondaryCurrent - totalCurrent).toFixed(2)
    };
  }, [departures, calculations.secondaryCurrent, useRealCurrent]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-indigo-600 rounded-xl">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Dimensionare Siguranțe Post Transformare MT/JT</h1>
              <p className="text-gray-600">Calcul automat conform practici inginerești România</p>
            </div>
          </div>

          {/* Avertisment */}
          <div className="mb-6 bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">Atenție:</p>
                <p>Valorile calculate sunt orientative. Pentru proiecte reale, consultați specificațiile tehnice ale operatorului de distribuție (Electrica, Enel, CEZ, etc.) și normativele în vigoare (PE 101, I7-02, ST unificate).</p>
              </div>
            </div>
          </div>

          {/* Date Transformator */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Date Transformator
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Putere Transformator (kVA)
                </label>
                <select
                  value={powerKVA}
                  onChange={(e) => setPowerKVA(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {transformerPowers.map(p => (
                    <option key={p} value={p}>{p} kVA</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tensiune Primară MT (kV)
                </label>
                <select
                  value={primaryVoltage}
                  onChange={(e) => setPrimaryVoltage(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value={6}>6 kV</option>
                  <option value={10}>10 kV</option>
                  <option value={20}>20 kV</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tensiune Secundară JT (kV)
                </label>
                <input
                  type="number"
                  value={secondaryVoltage}
                  onChange={(e) => setSecondaryVoltage(Number(e.target.value))}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Factor de Putere (cosφ)
                </label>
                <select
                  value={powerFactor}
                  onChange={(e) => setPowerFactor(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value={0.8}>0.8 (inductiv)</option>
                  <option value={0.85}>0.85</option>
                  <option value={0.9}>0.9 (standard)</option>
                  <option value={0.95}>0.95</option>
                  <option value={1.0}>1.0 (rezistiv)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Factor Siguranță General JT
                </label>
                <select
                  value={generalFuseFactor}
                  onChange={(e) => setGeneralFuseFactor(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value={0.8}>0.8 × In (conservator)</option>
                  <option value={0.9}>0.9 × In</option>
                  <option value={1.0}>1.0 × In (conform brosură)</option>
                  <option value={1.25}>1.25 × In (trafo mici)</option>
                  <option value={1.6}>1.6 × In (standard)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mod de calcul */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Mod de Calcul Încărcare Trafo
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="calculationMode"
                  checked={!useRealCurrent}
                  onChange={() => setUseRealCurrent(false)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Calcul automat (pe baza siguranțelor)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="calculationMode"
                  checked={useRealCurrent}
                  onChange={() => setUseRealCurrent(true)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Curent real din altă aplicație</span>
              </label>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              {useRealCurrent 
                ? "✏️ Introduceți curentul real (în A) pentru fiecare plecare din altă aplicație de calcul"
                : "🔢 Încărcarea se calculează automat pe baza siguranțelor selectate pentru fiecare plecare"
              }
            </div>
          </div>

          {/* Rezultate Calcule Principale */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Medie Tensiune */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Protecție Medie Tensiune (MT)</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Curent nominal primar:</span>
                  <span className="font-bold text-lg">{calculations.primaryCurrent} A</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Curent calcul (2.0 × In):</span>
                  <span className="font-semibold">{calculations.mvFuseCalc} A</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-orange-200">
                  <span className="text-gray-800 font-semibold">Siguranță fuzibilă MT:</span>
                  <span className="font-bold text-2xl text-orange-600">{calculations.mvFuse} A</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  * Protecție transformator pe partea primară
                </div>
              </div>
            </div>

            {/* Joasă Tensiune - General */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Protecție Joasă Tensiune - General Trafo</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Curent nominal secundar:</span>
                  <span className="font-bold text-lg">{calculations.secondaryCurrent} A</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Curent calcul ({generalFuseFactor} × In):</span>
                  <span className="font-semibold">{calculations.generalFuseCalc} A</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-green-200">
                  <span className="text-gray-800 font-semibold">Siguranță General Trafo:</span>
                  <span className="font-bold text-2xl text-green-600">{calculations.generalFuse} A</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  * Siguranță MPR sau disjunctor general JT
                </div>
              </div>
            </div>
          </div>

          {/* Plecări */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Plecări Joasă Tensiune</h3>
              <button
                onClick={addDeparture}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                + Adaugă Plecare
              </button>
            </div>

            {/* Grad de încărcare transformator */}
            <div className={`mb-6 rounded-lg p-5 border-2 ${
              loadingAnalysis.isOverloaded 
                ? 'bg-red-50 border-red-400' 
                : parseFloat(loadingAnalysis.loadingPercentage) > 90
                ? 'bg-yellow-50 border-yellow-400'
                : 'bg-green-50 border-green-400'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${
                  loadingAnalysis.isOverloaded 
                    ? 'text-red-600' 
                    : parseFloat(loadingAnalysis.loadingPercentage) > 90
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`} />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 mb-2">Grad de Încărcare Transformator</h4>
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 block">Curent nominal trafo:</span>
                      <span className="font-bold text-lg">{calculations.secondaryCurrent} A</span>
                    </div>
                    <div>
                      <span className="text-gray-600 block">
                        {useRealCurrent ? 'Σ Curenți reali plecări:' : 'Σ Siguranțe plecări:'}
                      </span>
                      <span className="font-bold text-lg">{loadingAnalysis.totalCurrent} A</span>
                    </div>
                    <div>
                      <span className="text-gray-600 block">Grad încărcare:</span>
                      <span className={`font-bold text-2xl ${
                        loadingAnalysis.isOverloaded 
                          ? 'text-red-600' 
                          : parseFloat(loadingAnalysis.loadingPercentage) > 90
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {loadingAnalysis.loadingPercentage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 block">Rezervă disponibilă:</span>
                      <span className={`font-bold text-lg ${
                        parseFloat(loadingAnalysis.availableCurrent) < 0 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {loadingAnalysis.availableCurrent} A
                      </span>
                    </div>
                  </div>
                  
                  {loadingAnalysis.isOverloaded && (
                    <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                      <p className="text-red-800 font-semibold">⚠️ ATENȚIE: Supraîncărcare transformator!</p>
                      <p className="text-red-700 text-sm mt-1">
                        {useRealCurrent 
                          ? `Suma curenților reali pe plecări (${loadingAnalysis.totalCurrent} A)`
                          : `Suma curenților nominali ai siguranțelor pe plecări (${loadingAnalysis.totalCurrent} A)`
                        } depășește curentul nominal al transformatorului ({calculations.secondaryCurrent} A).
                        <br/>
                        <strong>Recomandare:</strong> {useRealCurrent 
                          ? 'Reduceți încărcările pe plecări sau alegeți un transformator de putere superioară.'
                          : 'Reduceți siguranțele pe plecări sau alegeți un transformator de putere superioară.'
                        }
                      </p>
                    </div>
                  )}
                  
                  {!loadingAnalysis.isOverloaded && parseFloat(loadingAnalysis.loadingPercentage) > 90 && (
                    <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
                      <p className="text-yellow-800 font-semibold">⚠️ Atenție: Grad de încărcare ridicat!</p>
                      <p className="text-yellow-700 text-sm mt-1">
                        Gradul de încărcare depășește 90%. Considerați posibilitatea utilizării unui transformator de putere superioară 
                        pentru a permite extensii viitoare și a evita funcționarea la limită.
                      </p>
                    </div>
                  )}
                  
                  {!loadingAnalysis.isOverloaded && parseFloat(loadingAnalysis.loadingPercentage) <= 90 && (
                    <div className="mt-3 p-3 bg-green-100 rounded border border-green-300">
                      <p className="text-green-800 font-semibold">✓ Încărcare optimă</p>
                      <p className="text-green-700 text-sm mt-1">
                        Transformatorul este dimensionat corespunzător. Mai aveți disponibili {loadingAnalysis.availableCurrent} A 
                        pentru plecări suplimentare.
                      </p>
                    </div>
                  )}
                  
                  {/* Bara de progres */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          loadingAnalysis.isOverloaded 
                            ? 'bg-red-600' 
                            : parseFloat(loadingAnalysis.loadingPercentage) > 90
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(parseFloat(loadingAnalysis.loadingPercentage), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {departures.map((dep, index) => {
                const fuseData = calculateDepartureFuse(dep.cableType, dep.section, dep.manualFuse);
                
                // Calcul siguranță optimă pentru această plecare
                const currentSum = departures.reduce((sum, d) => {
                  const fd = calculateDepartureFuse(d.cableType, d.section, d.manualFuse);
                  return sum + (typeof fd.fuse === 'number' ? fd.fuse : 0);
                }, 0);
                const secondaryIn = parseFloat(calculations.secondaryCurrent);
                const withoutCurrent = currentSum - (typeof fuseData.fuse === 'number' ? fuseData.fuse : 0);
                const availableForThisDep = secondaryIn - withoutCurrent;
                
                // Siguranțe valide pentru acest cablu (In ≤ Iz)
                const validFuses = fuseSeriesLV.filter(f => f <= (fuseData.admissible as number));
                
                // Siguranță optimă recomandată
                const optimalFuse = validFuses.filter(f => f <= availableForThisDep).pop();
                
                return (
                  <div key={dep.id} className="bg-white rounded-lg p-5 shadow-md border-2 border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-800">Plecare #{index + 1}</h4>
                        <span className="text-xs text-gray-500">{fuseData.type}</span>
                      </div>
                      {departures.length > 1 && (
                        <button
                          onClick={() => removeDeparture(dep.id)}
                          className="text-red-500 hover:text-red-700 font-medium text-sm"
                        >
                          Șterge
                        </button>
                      )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tip Cablu/Conductor (Aluminiu)
                        </label>
                        <select
                          value={dep.cableType}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const newCableType = e.target.value as keyof CableDatabase;
                            updateDeparture(dep.id, 'cableType', newCableType);
                            const firstSection = Object.keys(cableData[newCableType])[0];
                            updateDeparture(dep.id, 'section', firstSection);
                            updateDeparture(dep.id, 'manualFuse', null);
                          }}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="NFA2X">NFA2X (conductor torsadat aerian)</option>
                          <option value="NA2XABY">NA2XABY (cablu subteran armat)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Secțiune
                        </label>
                        <select
                          value={dep.section}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            updateDeparture(dep.id, 'section', e.target.value);
                            updateDeparture(dep.id, 'manualFuse', null);
                          }}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          {(Object.entries(cableData[dep.cableType as keyof CableDatabase] || {}) as [string, CableData][]).map(([sec, data]) => (
                            <option key={sec} value={sec}>{data.description}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                      <div className="grid md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <span className="text-sm text-gray-600 block mb-1">Curent admisibil Iz:</span>
                          <span className="text-lg font-bold text-gray-800">{fuseData.admissible} A</span>
                          <span className="text-xs text-gray-500 block mt-1">În aer la 30°C</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 block mb-1">Siguranță automată:</span>
                          <span className="text-lg font-semibold text-gray-800">{fuseData.autoFuse} A</span>
                          <span className="text-xs text-gray-500 block mt-1">In ≤ Iz</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 block mb-1">Rezervă trafo aici:</span>
                          <span className={`text-lg font-bold ${availableForThisDep >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {availableForThisDep.toFixed(0)} A
                          </span>
                          <span className="text-xs text-gray-500 block mt-1">Disponibil acum</span>
                        </div>
                      </div>
                      
                      {/* Selector manual siguranță */}
                      <div className="border-t-2 border-indigo-200 pt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🎛️ Ajustare Manuală Siguranță (In ≤ Iz = {fuseData.admissible} A)
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={dep.manualFuse || fuseData.autoFuse}
                            onChange={(e) => {
                              const value = e.target.value === 'auto' ? null : Number(e.target.value);
                              updateDeparture(dep.id, 'manualFuse', value);
                            }}
                            className="flex-1 px-4 py-2 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-semibold"
                          >
                            <option value="auto">Auto: {fuseData.autoFuse} A (maxim pt cablu)</option>
                            {validFuses.map(f => {
                              const wouldOverload = (withoutCurrent + f) > secondaryIn;
                              const isOptimal = f === optimalFuse;
                              return (
                                <option key={f} value={f}>
                                  {f} A {isOptimal ? '⭐ (optim pt trafo)' : ''} {wouldOverload ? '⚠️ (supraîncărcare!)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          
                          {dep.manualFuse !== null && (
                            <button
                              onClick={() => updateDeparture(dep.id, 'manualFuse', null)}
                              className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        
                        {/* Indicator vizual siguranță selectată */}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm text-gray-600">Siguranță selectată:</span>
                          <span className={`text-3xl font-bold ${
                            dep.manualFuse !== null ? 'text-purple-600' : 'text-indigo-600'
                          }`}>
                            {fuseData.fuse} A
                            {dep.manualFuse !== null && <span className="text-sm ml-2">(manual)</span>}
                          </span>
                        </div>
                      </div>
                      
                      {/* Câmp pentru curent real - doar când e selectat modul manual */}
                      {useRealCurrent && (
                        <div className="border-t-2 border-purple-200 pt-3 mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🔌 Curent Real din Altă Aplicație (A)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={dep.realCurrent || ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : Number(e.target.value);
                                updateDeparture(dep.id, 'realCurrent', value);
                              }}
                              placeholder="Introduceți curentul real..."
                              step="0.1"
                              min="0"
                              className="flex-1 px-4 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
                            />
                            <span className="text-sm text-gray-600">A</span>
                          </div>
                          <div className="mt-2 text-xs text-purple-600">
                            💡 Introduceți valoarea curentului real calculat în altă aplicație pentru această plecare
                          </div>
                        </div>
                      )}
                      
                      {/* Recomandări inteligente */}
                      {optimalFuse && optimalFuse < (fuseData.autoFuse as number) && (
                        <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-300">
                          <p className="text-blue-800 text-sm font-semibold">💡 Recomandare optimizare trafo</p>
                          <p className="text-blue-700 text-xs mt-1">
                            Deși cablul permite {fuseData.autoFuse} A, pentru a optimiza încărcarea transformatorului 
                            se recomandă <strong>{optimalFuse} A</strong>. Aveți disponibili {availableForThisDep.toFixed(0)} A pe această plecare.
                          </p>
                        </div>
                      )}
                      
                      {dep.manualFuse !== null && dep.manualFuse > availableForThisDep && (
                        <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                          <p className="text-red-800 text-sm font-semibold">⚠️ Atenție: Contribuție la supraîncărcare!</p>
                          <p className="text-red-700 text-xs mt-1">
                            Siguranța selectată ({dep.manualFuse} A) depășește curentul disponibil ({availableForThisDep.toFixed(0)} A) 
                            și contribuie la supraîncărcarea transformatorului.
                          </p>
                        </div>
                      )}
                      
                      {dep.manualFuse !== null && dep.manualFuse <= availableForThisDep && dep.manualFuse !== fuseData.autoFuse && (
                        <div className="mt-3 p-3 bg-green-100 rounded border border-green-300">
                          <p className="text-green-800 text-sm font-semibold">✓ Siguranță ajustată corect</p>
                          <p className="text-green-700 text-xs mt-1">
                            Siguranța manuală ({dep.manualFuse} A) respectă atât limita cablului ({fuseData.admissible} A) 
                            cât și capacitatea transformatorului.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info tehnice */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-2">Criterii de dimensionare utilizate:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Siguranță MT:</strong> In = 2.0 × Curent nominal primar (protecție transformator)</li>
                  <li><strong>Siguranță General JT:</strong> In = 1.6 × Curent nominal secundar (protecție și selectivitate)</li>
                  <li><strong>Siguranțe plecări:</strong> In ≤ Iz (curent admisibil cablu) - conform I7/SR HD 60364-5-52</li>
                  <li><strong>Conductoare:</strong> Aluminiu (AL) - NFA2X (torsadat aerian) și NA2XABY (subteran armat)</li>
                  <li><strong>Puteri transformator:</strong> 50 - 1000 kVA (valori standardizate)</li>
                  <li><strong>Verificări necesare:</strong> Putere scurtcircuit, protecție diferențială, coordonare protecții</li>
                </ul>
                <p className="mt-3 font-semibold">Date tehnice cabluri:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>NFA2X:</strong> Conductor torsadat aerian, secțiuni 50+3x50 până la 3x95+50 mm²</li>
                  <li><strong>NA2XABY:</strong> Cablu subteran armat, secțiuni 3x25+16 până la 3x240+120 mm²</li>
                  <li>Curenți admisibili conform cataloage producători din România și SR HD 60364-5-52</li>
                </ul>
                <p className="mt-3 text-xs italic">
                  Referințe: PE 101/85, I7-02, SR HD 60364-5-52, Specificații Tehnice Unificate OD
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransformerFuseCalculator;