'use client'

import { useState } from 'react'
import { Calculator, Ruler, MapPin, Package, AlertCircle } from 'lucide-react'
import { calculateCanopyPrice, formatRupiah, formatNumber } from '@/lib/calculator'
import type { CalculatorInput, CalculatorResult } from '@/lib/types'

export default function CanopyCalculator() {
  const [input, setInput] = useState<CalculatorInput>({
    panjang: 5,
    lebar: 3,
    jenis: 'standard'
  })
  
  const [result, setResult] = useState<(CalculatorResult & { isCustom?: boolean }) | null>(null)
  const [loading, setLoading] = useState(false)
  
  const handleInputChange = (field: keyof CalculatorInput, value: CalculatorInput[typeof field]) => {
    setInput(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleCalculate = async () => {
    setLoading(true)
    try {
      // ESCAPE HATCH: Jika custom, langsung set result khusus
      if (input.jenis === 'custom') {
        setResult({
          luas: input.panjang * input.lebar,
          materialCost: 0,
          wasteCost: 0,
          totalHpp: 0,
          marginPercentage: 0,
          markupPercentage: 0,
          flatFee: 0,
          totalSellingPrice: 0,
          estimatedPrice: 0,
          breakdown: [],
          isCustom: true
        })
        return
      }
      
      const calculation = await calculateCanopyPrice(input)
      setResult(calculation)
    } catch (error) {
      console.error('Calculation error:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleReset = () => {
    setInput({
      panjang: 5,
      lebar: 3,
      jenis: 'standard'
    })
    setResult(null)
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Calculator className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-dark">
              Kalkulator Harga Kanopi
            </h2>
            <p className="text-gray-600 mt-2">
              Hitung estimasi biaya kanopi Anda secara instan dengan mempertimbangkan waste material dan zona lokasi.
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Ruler className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-primary-dark">Dimensi Kanopi</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">
                  <span className="flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Panjang (meter)
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={input.panjang}
                  onChange={(e) => handleInputChange('panjang', parseFloat(e.target.value) || 0)}
                  className="input"
                  placeholder="Contoh: 5"
                />
              </div>
              
              <div>
                <label className="label">
                  <span className="flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Lebar (meter)
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={input.lebar}
                  onChange={(e) => handleInputChange('lebar', parseFloat(e.target.value) || 0)}
                  className="input"
                  placeholder="Contoh: 3"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <label className="label">
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Jenis Permintaan
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('jenis', 'standard')
                  }}
                  className={`flex-1 btn ${input.jenis === 'standard' ? 'btn-primary' : 'btn-outline'}`}
                >
                  <Package className="w-4 h-4" />
                  Standard (Auto Kalkulasi)
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('jenis', 'custom')
                  }}
                  className={`flex-1 btn ${input.jenis === 'custom' ? 'btn-primary' : 'btn-outline'}`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Custom (Manual Quote)
                </button>
              </div>
              
              {input.jenis === 'custom' && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-800">Permintaan Custom</h4>
                      <p className="text-yellow-700 text-sm mt-1">
                        Untuk permintaan custom dengan spesifikasi khusus, tim kami akan menghubungi Anda untuk memberikan penawaran manual.
                      </p>
                      <textarea
                        value={input.customNotes || ''}
                        onChange={(e) => handleInputChange('customNotes', e.target.value)}
                        className="input mt-3"
                        rows={3}
                        placeholder="Deskripsikan kebutuhan spesifik Anda (material, desain, dll)..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <label className="label">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Zona Lokasi (Opsional)
                </span>
              </label>
              <select
                value={input.zoneId || ''}
                onChange={(e) => handleInputChange('zoneId', e.target.value || undefined)}
                className="input"
              >
                <option value="">Pilih zona lokasi...</option>
                <option value="jaksel">Jakarta Selatan (+5%)</option>
                <option value="jaktim">Jakarta Timur (+5%)</option>
                <option value="jakbar">Jakarta Barat (+5%)</option>
                <option value="depok">Depok (+0%)</option>
                <option value="bogor">Bogor (+2%)</option>
                <option value="bekasi">Bekasi (+3%)</option>
              </select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="flex-1 btn btn-primary text-lg py-4"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Menghitung...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    Hitung Estimasi
                  </>
                )}
              </button>
              
              <button
                onClick={handleReset}
                type="button"
                className="btn btn-outline py-4"
              >
                Reset
              </button>
            </div>
          </div>
          
          {/* Information Panel */}
          <div className="card bg-primary-light/30 border-primary/20">
            <h4 className="font-bold text-primary-dark mb-4 text-lg">Catatan Penting:</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <span className="text-gray-700">
                  <span className="font-semibold">Waste Calculation:</span> Perhitungan menggunakan <code className="bg-gray-100 px-1.5 py-0.5 rounded">Math.ceil()</code> untuk pembulatan ke atas material batangan/lembaran.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <span className="text-gray-700">
                  <span className="font-semibold">Escape Hatch:</span> Permintaan custom akan langsung ditandai <span className="font-semibold text-primary">&quot;Need Manual Quote&quot;</span> dan bypass auto-kalkulasi.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <span className="text-gray-700">
                  Harga merupakan estimasi awal. Survey lapangan mungkin diperlukan untuk akurasi maksimal.
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Results Section */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="card bg-gradient-to-br from-primary-dark to-primary-dark/90 text-white">
              <h3 className="text-2xl font-bold mb-6">Hasil Perhitungan</h3>
              
              {result ? (
                result.isCustom ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-white/10 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-yellow-300" />
                        <h4 className="text-lg font-bold">Permintaan Custom</h4>
                      </div>
                      <p className="text-white/90">
                        Tim kami akan menghubungi Anda untuk memberikan penawaran manual berdasarkan spesifikasi yang diminta.
                      </p>
                      {input.customNotes && (
                        <div className="mt-4 p-3 bg-white/5 rounded-lg">
                          <p className="text-sm font-medium mb-1">Catatan Anda:</p>
                          <p className="text-white/80 text-sm">{input.customNotes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-white/20">
                        <span>Luas Area</span>
                        <span className="font-bold">{formatNumber(result.luas)} m²</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => window.location.href = '/kontak'}
                      className="w-full btn bg-white text-primary-dark hover:bg-white/90 font-bold py-4"
                    >
                      Hubungi Tim Sales
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-white/20">
                        <span>Luas Area</span>
                        <span className="font-bold">{formatNumber(result.luas)} m²</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-3 border-b border-white/20">
                        <span>Biaya Material</span>
                        <span className="font-bold">{formatRupiah(result.materialCost)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-3 border-b border-white/20">
                        <span>Waste Material</span>
                        <span className="font-bold text-yellow-300">{formatRupiah(result.wasteCost)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-3 border-b border-white/20">
                        <span>Total HPP</span>
                        <span className="font-bold">{formatRupiah(result.totalHpp)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-3 border-b border-white/20">
                        <span>Margin ({result.marginPercentage}%)</span>
                        <span className="font-bold">+{formatRupiah(result.totalHpp * (result.marginPercentage / 100))}</span>
                      </div>
                      
                      {result.markupPercentage > 0 && (
                        <div className="flex justify-between items-center py-3 border-b border-white/20">
                          <span>Markup Zona ({result.markupPercentage}%)</span>
                          <span className="font-bold">+{formatRupiah(result.totalHpp * (1 + result.marginPercentage / 100) * (result.markupPercentage / 100))}</span>
                        </div>
                      )}
                      
                      <div className="pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg">Estimasi Harga</span>
                          <span className="text-2xl font-bold">{formatRupiah(result.estimatedPrice)}</span>
                        </div>
                        <p className="text-white/70 text-sm mt-2">
                          *Harga sudah termasuk PPN 11%
                        </p>
                      </div>
                    </div>
                    
                    {/* Breakdown */}
                    {result.breakdown.length > 0 && (
                      <div className="pt-6 border-t border-white/20">
                        <h4 className="font-bold mb-4">Detail Material</h4>
                        <div className="space-y-3">
                          {result.breakdown.map((item, index) => (
                            <div key={index} className="p-3 bg-white/5 rounded-lg">
                              <div className="flex justify-between mb-1">
                                <span className="font-medium">{item.name}</span>
                                <span className="font-bold">{formatRupiah(item.subtotal)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-white/70">
                                <span>
                                  {formatNumber(item.qtyNeeded)} → {formatNumber(item.qtyCharged)} {item.unit}
                                  <span className="ml-2 text-yellow-300">
                                    (+{formatNumber(item.qtyCharged - item.qtyNeeded)} waste)
                                  </span>
                                </span>
                                <span>{formatRupiah(item.pricePerUnit)}/{item.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* CTA Buttons */}
                    <div className="space-y-3 pt-6">
                      <button
                        onClick={() => window.location.href = '/konsultasi'}
                        className="w-full btn bg-primary text-white hover:bg-primary/90 font-bold py-4"
                      >
                        Konsultasi Gratis
                      </button>
                      <button
                        onClick={() => window.location.href = '/katalog'}
                        className="w-full btn bg-white/20 text-white hover:bg-white/30 font-bold py-4"
                      >
                        Lihat Katalog Paket
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                    <Calculator className="w-8 h-8 text-white/60" />
                  </div>
                  <p className="text-white/80">
                    Masukkan dimensi kanopi Anda dan klik &quot;Hitung Estimasi&quot; untuk melihat perhitungan detail.
                  </p>
                </div>
              )}
            </div>
            
            {/* Quick Info */}
            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <h4 className="font-bold text-primary-dark mb-2">Garansi & Layanan</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>Garansi material 5 tahun</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>Survey & konsultasi gratis</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>Free maintenance 1 tahun</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}