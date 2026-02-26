
export const cleanName = (name: string | null | undefined) => {
  if (!name) return '-';
  return name.replace(/\s+\d+\s+(Kg|unit|m2|m1|btg|lembar|bt|lbr)$|(\s+\d+Kg)$|(\s+1\s+K)$/i, '').trim();
};

export const resolveItemSpecs = (item: any) => {
    const builderCosts = item.builder_costs || [];
    
    // 1. Trace Rangka Utama
    const rangkaUtamaRaw = (item.rangka?.name) || 
      builderCosts.find((c: any) => c.type === 'rangka' || c.section === 'rangka')?.name ||
      builderCosts.find((c: any) => 
        ((c.name || '').toLowerCase().includes('hollow') && 
         !(c.name || '').toLowerCase().includes('20x') && 
         !(c.name || '').toLowerCase().includes('jari') && 
         !(c.name || '').toLowerCase().includes('kisi')) ||
        (c.name || '').toLowerCase().includes('wf')
      )?.name;
    
    // 2. Trace Isian / Jari-jari
    const rangkaDalamRaw = (item.isian?.name) || 
      builderCosts.find((c: any) => c.type === 'isian' || c.section === 'isian')?.name ||
      builderCosts.find((c: any) => 
        (c.name || '').toLowerCase().includes('jari') || 
        (c.name || '').toLowerCase().includes('kisi') ||
        (c.name || '').toLowerCase().includes('20x') ||
        (c.name || '').toLowerCase().includes('woodplank') ||
        (c.name || '').toLowerCase().includes('expanded')
      )?.name;
    
    // 3. Trace Atap / Cover
    const atapRaw = (item.atap?.name) || 
      builderCosts.find((c: any) => c.type === 'atap' || c.section === 'atap')?.name ||
      builderCosts.find((c: any) => 
        (c.name || '').toLowerCase().includes('alderon') || 
        (c.name || '').toLowerCase().includes('spandek') || 
        (c.name || '').toLowerCase().includes('solarflat') ||
        (c.name || '').toLowerCase().includes('kaca') ||
        (c.name || '').toLowerCase().includes('polycarbonate')
      )?.name;
    
    // 4. Trace Finishing
    const finishingRaw = (item.finishing?.name) || 
      builderCosts.find((c: any) => c.type === 'finishing' || c.section === 'finishing')?.name ||
      builderCosts.find((c: any) => 
        (c.name || '').toLowerCase().includes('cat') || 
        (c.name || '').toLowerCase().includes('duco') ||
        (c.name || '').toLowerCase().includes('epoxy') ||
        (c.name || '').toLowerCase().includes('powder') ||
        (c.name || '').toLowerCase().includes('galvanize')
      )?.name;

    return {
        rangkaUtama: cleanName(rangkaUtamaRaw || 'Besi Hollow Galvanis 40x40 mm 1.2 mm'),
        rangkaDalam: cleanName(rangkaDalamRaw),
        atap: cleanName(atapRaw),
        finishing: cleanName(finishingRaw) // Removed default value
    };
}
