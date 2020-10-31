const checkInRange = (min, max) => x => (min <= x && x <= max);
const checkExceed = (target, sign = 1.) => x => (x - target) * sign > 0;
const checkSame = (target, eps) => x => Math.abs(x - target) < eps;

/** recordLocalEquilibriumCondition
 * Simulate transition of the composition of host melt and involved solid phases
 *   during a reaction of melting or crystallization.
 * It starts from a condition where the host melt has a specific composition.
 * In each calculation step of, we calculate composition of solid phases
 *   by using partitioning coefficient assuming achievement of local equilibrium with host melt.
 * Then, when crystal growth is considered, small fraction of solid phases are removed from the host melt.
 * On the other hand, when assimilation of crystal is considered, they are added to the host melt.
 * In the calculation, we use Mg# of some phase as an extent of progression of the reaction.
 * Until Mg# of the focused phase becomes a given value, the steps are repeated.
 *
 * @param {*} magma
 * @param {*} observedPhaseName
 * @param {*} targetMgN
 * @param {*} stoichiometry
 * @param {*} dF
 * @param {*} toBeRecord
 *
 * moveCrystalBoundary(
 *  magma,
 *  'orthopyroxene',
 *  91.5,
 *  {olivine : 0.5, orthopyroxene : 0.495, spinel : 0.005},
 *  0.001,
 *  true
 * )
 */
const recordProfileWithLocalEquilibrium = (
    magma,
    observedPhaseName,
    targetMgN,
    stoichiometry,
    dF,
    toBeRecord
) => {
    const melt = magma.phase.melt;

    const observedPhase = magma.phase[observedPhaseName];
    let { T, P } = magma.getThermodynamicProperty();
    observedPhase.equilibrate('melt', T, P)

    const { sign, pathName } = (observedPhase.getMgNumber() < targetMgN)
        ? { sign: 1., pathName: 'ascend' }
        : { sign: -1., pathName: 'descend' };

    const isExceed = checkExceed(targetMgN, sign);
    const isInRange = checkInRange(-1, 1);
    const isSame = checkSame(targetMgN, 1e-3);
    let F = 0;
    const solids = Object.entries(magma.solids());

    solids.map(([_, phase]) => {
        phase.resetProfile(pathName);
    })

    melt.resetProfile(pathName);

    // repeat until Mg# of targetPhase exceeds targetMgN or F becomes out of range [0,1]
    let limit = 0
    melt.startDifferentiate();
    while (isInRange(F)
        && !isExceed(observedPhase.getMgNumber())
        && !melt.outOfRange
    ) {
        let { T, P } = magma.getThermodynamicProperty();

        // equilibrate & record
        solids.map(entry => {
            entry[1].equilibrate('melt', T, P)
        })

        if (toBeRecord) {
            // Record initial condition
            solids.map(([name, phase]) => {
                phase.pushProfile(stoichiometry[name] * F, T, P, pathName)
            })
            melt.pushProfile(1 + F * sign, T, P, pathName)
        }

        // change melt as not exceeding final condition
        melt.differentiate(
            solids.map(([name, phase]) => { return { phase: phase, f: stoichiometry[name] } }),
            dF * sign
        )
            .compensateFe()

        // to check whether exceeding final condition
        observedPhase.equilibrate('melt', T, P)

        // While exceeding final condition,
        //  revert melt composition and add/remove
        //  smaller fraction of solid again.
        while (isExceed(observedPhase.getMgNumber())) {
            let { T, P } = magma.getThermodynamicProperty();

            // revert change of melt composition
            melt.differentiate(
                solids.map(([name, phase]) => { return { phase: phase, f: stoichiometry[name] } }),
                dF * sign / (1 + dF * sign) * -1
            ).compensateFe()

            // change with smaller fraction
            dF *= 0.5;
            melt.differentiate(
                solids.map(([name, phase]) => { return { phase: phase, f: stoichiometry[name] } }),
                dF * sign
            ).compensateFe()

            // re-equilibrate to check whether exceeding final condition
            solids.map(entry => {
                entry[1].equilibrate('melt', T, P)
            })

            limit++
            if (limit > 100) break;
        }


        // Update total fraction not exceeding final condition
        F += dF;

        if (isSame(observedPhase.getMgNumber())) break;
    }

    // Record final state
    if (toBeRecord) {
        solids.map(entry => {
            let name = entry[0], phase = entry[1];
            phase.pushProfile(stoichiometry[name] * F, T, P, pathName);
        })
        melt.pushProfile(1 + F * sign, T, P, pathName);
    }
    return pathName;

}

module.exports = recordProfileWithLocalEquilibrium
