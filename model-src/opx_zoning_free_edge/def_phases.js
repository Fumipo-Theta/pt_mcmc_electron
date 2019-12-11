const Liquid = require('../../../phase/src/liquid');
const Solid = require('../../../phase/src/solid');
const { thermometer } = require('../../../phase/src/geothermobarometer');
const Equilibrate = require('../../../phase/src/equilibrate');
const D = require('../../../phase/src/partitioning');
const KD = require('../../../phase/src/exchangePartitioning');

const melt = new Liquid('melt').initialize()

const olivine = new Solid('olivine')
    .initialize()
    .setKD({
        'Fe_Mg': KD.olivine.Fe_Mg.Beattie1993()
    })
    .setD({
        'Cr2O3': D.olivine.Cr2O3.FreiS2009(),
        'NiO': D.olivine.NiO.NormanS2005(),
        'Al2O3': D.olivine.Al2O3.myCompile(melt),
        'CaO': D.olivine.CaO.myCompile(melt),
        'TiO2': D.olivine.TiO2.dummy()
    })
    .setSolver('melt', Equilibrate.olivine_melt(melt, 'solve'));

const orthopyroxene = new Solid('orthopyroxene')
    .initialize()
    .setKD({ 'Fe_Mg': KD.orthopyroxene.Fe_Mg.Beattie1993() })
    .setD({
        'Cr2O3': D.orthopyroxene.Cr2O3.FreiS2009(),
        'NiO': D.orthopyroxene.NiO.NormanS2005(),
        'Al2O3': D.orthopyroxene.Al2O3.myCompile(melt),
        'CaO': D.orthopyroxene.CaO.myCompile(melt),
        'TiO2': D.orthopyroxene.TiO2.dummy()
    })
    .setSolver('melt', Equilibrate.opx_melt(melt, 'solve'));

const spinel = new Solid('spinel')
    .initialize()
    .setD({
        'Cr2O3': D.spinel.Cr2O3.LieS2008(),
        'NiO': D.spinel.NiO.LieS2008()
    })
    .setSolver('melt', Equilibrate.spinel_melt(melt, 'solve'));

const meltThermometer = (P) => thermometer.Sugawara2000(melt)(P) - thermometer.liquidusDropMG2008(melt)(P);

module.exports = {
    melt,
    olivine,
    orthopyroxene,
    spinel,
    meltThermometer
}
