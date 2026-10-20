"use client";

import React from "react";
import Image from "next/image";
import { StockProvider, useStocks, StockManager, DeliverySelector, StockDose, StockBudget, setStockLines, liquidBudget } from "./StockWorkspace";
import { csvCell, downloadFile, concentration } from "../../lib/stocks.mjs";

const COMPOUNDS = {
  yvo4: {
    key: "yvo4",
    formula: "YVO₄",
    hostElement: "Y",
    hostOxide: "Y₂O₃",
    filePrefix: "yvo4",
  },
  gdvo4: {
    key: "gdvo4",
    formula: "GdVO₄",
    hostElement: "Gd",
    hostOxide: "Gd₂O₃",
    filePrefix: "gdvo4",
  },
};

const RARE_EARTH_DOPANTS = {
  Sc: "Sc₂O₃",
  Tm: "Tm₂O₃",
  Eu: "Eu₂O₃",
  Er: "Er₂O₃",
  Yb: "Yb₂O₃",
  Ho: "Ho₂O₃",
  Dy: "Dy₂O₃",
  Tb: "Tb₂O₃",
  Gd: "Gd₂O₃",
  Sm: "Sm₂O₃",
  Nd: "Nd₂O₃",
  Pr: "Pr₂O₃",
  Ce: "Ce₂O₃",
  La: "La₂O₃",
  Lu: "Lu₂O₃",
};

const OTHER_SUBSTITUENTS = { Bi: "Bi₂O₃" };
const ALL_ADDITIVES = { ...RARE_EARTH_DOPANTS, ...OTHER_SUBSTITUENTS };

const MATERIALS = {
  "Sc₂O₃": 137.91,
  "Lu₂O₃": 397.9318,
  "V₂O₅": 181.8804,
  "Y₂O₃": 225.8982,
  "Bi₂O₃": 465.959,
  "Tm₂O₃": 385.8672,
  "Eu₂O₃": 351.926,
  "Er₂O₃": 382.5176,
  "Yb₂O₃": 394.0782,
  "Ho₂O₃": 377.8586,
  "Dy₂O₃": 372.9982,
  "Tb₂O₃": 365.8678,
  "Gd₂O₃": 362.4982,
  "Sm₂O₃": 348.7182,
  "Nd₂O₃": 336.4782,
  "Pr₂O₃": 329.8082,
  "Ce₂O₃": 328.2382,
  "La₂O₃": 325.8092,
};

const BASE_METAL_MOL = 0.004;
const DEFAULT_SET_COUNT = 4;
const DEFAULT_DECIMAL_PLACES = 4;
const DEFAULT_ADJUSTMENT_STEP = "0.0001";

const STORAGE_KEYS = {
  selectedCompound: "weighing_selectedCompound",
  selectedDopants: "weighing_selectedDopants",
  targetMol: "weighing_targetMol",
  concentrationSets: "weighing_concentrationSets",
  measuredValues: "weighing_measuredValues",
  weightedMaterials: "weighing_weightedMaterials",
  setCount: "weighing_setCount",
  decimalPlaces: "weighing_decimalPlaces",
  adjustmentStep: "weighing_adjustmentStep",
};

const makeSetNumbers = (count) =>
  Array.from({ length: count }, (_, index) => index + 1);

const makeEmptySets = (count) =>
  Object.fromEntries(makeSetNumbers(count).map((setNumber) => [setNumber, {}]));

const clampInteger = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

const normalizeSets = (sets, count) => {
  const source = sets && typeof sets === "object" ? sets : {};
  return Object.fromEntries(
    makeSetNumbers(count).map((setNumber) => [setNumber, { ...(source[setNumber] || {}) }])
  );
};

const formatDisplayNumber = (value, maxDecimalPlaces) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "0";

  const precision = Math.max(0, maxDecimalPlaces);
  const factor = 10 ** precision;
  const rounded = Math.round((numericValue + Number.EPSILON) * factor) / factor;
  if (Object.is(rounded, -0)) return "0";
  const fixedValue = rounded.toFixed(precision);
  return fixedValue.includes(".") ? fixedValue.replace(/0+$/, "").replace(/\.$/, "") : fixedValue;
};

const decimalLength = (value) => {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("e-")) return Number(normalized.split("e-")[1]) || 0;
  return normalized.includes(".") ? normalized.split(".")[1].length : 0;
};

function CalculationBreakdown({ compound, results, selectedDopants, concentrationSets, setNumbers, targetMol, formatValue, formatPercentage }) {
  const targetMetalMol = Number(targetMol);

  return (
    <div className="calculation-breakdown">
      <p className="calculation-intro">
        酸化物1 molには対象元素が2 mol含まれるため、元素の必要モル数を2で割り、各酸化物の分子量を掛けて秤量値を求めます。
      </p>
      {setNumbers.map((setNumber) => {
        const result = results[setNumber];
        const substitutions = selectedDopants.map((element) => ({
          element,
          concentration: Number(concentrationSets[setNumber]?.[element] || 0),
        }));
        const substitutionTotal = substitutions.reduce((sum, item) => sum + item.concentration, 0);
        const hostConcentration = 100 - substitutionTotal;
        const subtractionText = substitutions.length
          ? substitutions.map((item) => `${item.element} ${formatPercentage(item.concentration)}%`).join(" + ")
          : "0%";

        return (
          <section className="calculation-set" key={setNumber} aria-labelledby={`calculation-set-${setNumber}`}>
            <div className="calculation-set-heading">
              <h4 id={`calculation-set-${setNumber}`}>セット {setNumber}</h4>
              <span>{compound.hostElement} {formatPercentage(hostConcentration)}%</span>
            </div>
            <p className="host-calculation">
              母体材料比率：100% −（{subtractionText}）= {formatPercentage(hostConcentration)}%
            </p>
            <div className="calculation-equations">
              {Object.entries(result.masses).map(([material, mass]) => {
                const additive = selectedDopants.find((element) => ALL_ADDITIVES[element] === material);
                const concentration = material === "V₂O₅"
                  ? 100
                  : material === compound.hostOxide
                    ? hostConcentration
                    : Number(concentrationSets[setNumber]?.[additive] || 0);
                const molarMass = MATERIALS[material];
                const formula = material === "V₂O₅"
                  ? `${formatDisplayNumber(targetMetalMol, 8)} mol ÷ 2 × ${formatDisplayNumber(molarMass, 8)} g/mol`
                  : `${formatDisplayNumber(targetMetalMol, 8)} mol × (${formatPercentage(concentration)} ÷ 100) ÷ 2 × ${formatDisplayNumber(molarMass, 8)} g/mol`;

                return (
                  <div className="calculation-equation" key={material}>
                    <strong>{material}</strong>
                    <span>{formula}</span>
                    <b>= {formatValue(mass)} g</b>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StepperChevron({ direction }) {
  const path = direction === "up" ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4";
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepperField({ label, value, min, max, onChange, help }) {
  const update = (nextValue) => onChange(clampInteger(nextValue, min, max, value));

  return (
    <label className="setting-field">
      <span className="setting-label">{label}</span>
      <span className="stepper-shell">
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => update(event.target.value)}
        />
        <span className="stepper-buttons">
          <button type="button" aria-label={`${label}を増やす`} onClick={() => update(value + 1)}><StepperChevron direction="up" /></button>
          <button type="button" aria-label={`${label}を減らす`} onClick={() => update(value - 1)}><StepperChevron direction="down" /></button>
        </span>
      </span>
      <span className="setting-help">{help}</span>
    </label>
  );
}

function ElementButton({ element, selected, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`element-button ${selected ? "is-selected" : ""}`}
      onClick={onClick}
      onPointerUp={(event) => event.currentTarget.blur()}
    >
      {element}
    </button>
  );
}

function MainComponent() {
  const stockState = useStocks();
  const [activeView, setActiveView] = React.useState("calculator");
  const [selectedCompound, setSelectedCompound] = React.useState("yvo4");
  const [selectedDopants, setSelectedDopants] = React.useState([]);
  const [targetMol, setTargetMol] = React.useState("0.004");
  const [setCount, setSetCount] = React.useState(DEFAULT_SET_COUNT);
  const [decimalPlaces, setDecimalPlaces] = React.useState(DEFAULT_DECIMAL_PLACES);
  const [adjustmentStep, setAdjustmentStep] = React.useState(DEFAULT_ADJUSTMENT_STEP);
  const [concentrationSets, setConcentrationSets] = React.useState(() => makeEmptySets(DEFAULT_SET_COUNT));
  const [measuredValues, setMeasuredValues] = React.useState(() => makeEmptySets(DEFAULT_SET_COUNT));
  const [weightedMaterials, setWeightedMaterials] = React.useState(() => makeEmptySets(DEFAULT_SET_COUNT));
  const [results, setResults] = React.useState(null);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [showMaterials, setShowMaterials] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  const compound = COMPOUNDS[selectedCompound];
  const setNumbers = React.useMemo(() => makeSetNumbers(setCount), [setCount]);
  const availableRareEarths = React.useMemo(
    () => Object.keys(RARE_EARTH_DOPANTS).filter((element) => element !== compound.hostElement),
    [compound.hostElement]
  );
  const selectedRareEarths = selectedDopants.filter((element) => element in RARE_EARTH_DOPANTS);
  const selectedOtherSubstituents = selectedDopants.filter((element) => element in OTHER_SUBSTITUENTS);
  const concentrationStep = 10 ** -decimalPlaces;
  const adjustmentStepNumber = Number(adjustmentStep) > 0 ? Number(adjustmentStep) : Number(DEFAULT_ADJUSTMENT_STEP);
  const adjustmentPrecision = Math.min(8, Math.max(decimalPlaces, decimalLength(adjustmentStep)));

  React.useEffect(() => {
    try {
      const savedCount = clampInteger(localStorage.getItem(STORAGE_KEYS.setCount), 1, 20, DEFAULT_SET_COUNT);
      const savedPrecision = clampInteger(localStorage.getItem(STORAGE_KEYS.decimalPlaces), 0, 8, DEFAULT_DECIMAL_PLACES);
      const savedCompound = localStorage.getItem(STORAGE_KEYS.selectedCompound);
      const initialCompound = COMPOUNDS[savedCompound] ? savedCompound : "yvo4";
      const parsedDopants = JSON.parse(localStorage.getItem(STORAGE_KEYS.selectedDopants) || "[]")
        .filter((element) => element in ALL_ADDITIVES && element !== COMPOUNDS[initialCompound].hostElement);

      setSetCount(savedCount);
      setDecimalPlaces(savedPrecision);
      setSelectedCompound(initialCompound);
      setSelectedDopants(parsedDopants);
      setTargetMol(localStorage.getItem(STORAGE_KEYS.targetMol) || "0.004");
      const savedAdjustmentStep = localStorage.getItem(STORAGE_KEYS.adjustmentStep);
      setAdjustmentStep(savedAdjustmentStep && Number(savedAdjustmentStep) > 0 ? savedAdjustmentStep : DEFAULT_ADJUSTMENT_STEP);
      setConcentrationSets(normalizeSets(JSON.parse(localStorage.getItem(STORAGE_KEYS.concentrationSets) || "{}"), savedCount));
      setMeasuredValues(normalizeSets(JSON.parse(localStorage.getItem(STORAGE_KEYS.measuredValues) || "{}"), savedCount));
      setWeightedMaterials(normalizeSets(JSON.parse(localStorage.getItem(STORAGE_KEYS.weightedMaterials) || "{}"), savedCount));
    } catch (error) {
      console.error("保存済みデータを読み込めませんでした。", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return;
    const values = {
      [STORAGE_KEYS.selectedCompound]: selectedCompound,
      [STORAGE_KEYS.selectedDopants]: JSON.stringify(selectedDopants),
      [STORAGE_KEYS.targetMol]: targetMol,
      [STORAGE_KEYS.setCount]: String(setCount),
      [STORAGE_KEYS.decimalPlaces]: String(decimalPlaces),
      [STORAGE_KEYS.adjustmentStep]: adjustmentStep,
      [STORAGE_KEYS.concentrationSets]: JSON.stringify(concentrationSets),
      [STORAGE_KEYS.measuredValues]: JSON.stringify(measuredValues),
      [STORAGE_KEYS.weightedMaterials]: JSON.stringify(weightedMaterials),
    };
    Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value));
  }, [isHydrated, selectedCompound, selectedDopants, targetMol, setCount, decimalPlaces, adjustmentStep, concentrationSets, measuredValues, weightedMaterials]);

  const updateSetCount = (nextCount) => {
    setSetCount(nextCount);
    setConcentrationSets((current) => normalizeSets(current, nextCount));
    setMeasuredValues((current) => normalizeSets(current, nextCount));
    setWeightedMaterials((current) => normalizeSets(current, nextCount));
    setResults(null);
  };

  const switchCompound = (compoundKey) => {
    const nextCompound = COMPOUNDS[compoundKey];
    setSelectedCompound(compoundKey);
    setSelectedDopants((current) => current.filter((element) => element !== nextCompound.hostElement));
    setConcentrationSets((current) => Object.fromEntries(
      setNumbers.map((setNumber) => {
        const nextSet = { ...(current[setNumber] || {}) };
        delete nextSet[nextCompound.hostElement];
        return [setNumber, nextSet];
      })
    ));
    setResults(null);
  };

  const toggleDopant = (element) => {
    const removing = selectedDopants.includes(element);
    setSelectedDopants((current) =>
      removing ? current.filter((item) => item !== element) : [...current, element]
    );
    setConcentrationSets((current) => Object.fromEntries(
      setNumbers.map((setNumber) => {
        const nextSet = { ...(current[setNumber] || {}) };
        if (removing) delete nextSet[element];
        else nextSet[element] = "0";
        return [setNumber, nextSet];
      })
    ));
    setResults(null);
  };

  const updateConcentration = (setNumber, element, rawValue) => {
    const normalized = rawValue.replace(",", ".");
    const pattern = decimalPlaces === 0
      ? /^\d*$/
      : new RegExp(`^\\d*(?:\\.\\d{0,${decimalPlaces}})?$`);
    if (!pattern.test(normalized)) return;
    if (normalized !== "" && Number(normalized) > 100) return;

    setConcentrationSets((current) => ({
      ...current,
      [setNumber]: { ...current[setNumber], [element]: normalized },
    }));
    setResults(null);
  };

  const normalizeConcentration = (setNumber, element) => {
    const value = concentrationSets[setNumber]?.[element];
    if (value === "" || value === ".") updateConcentration(setNumber, element, "0");
  };

  const incrementConcentration = (setNumber, element, direction) => {
    const current = Number(concentrationSets[setNumber]?.[element] || 0);
    const next = Math.min(100, Math.max(0, current + concentrationStep * direction));
    updateConcentration(setNumber, element, next.toFixed(decimalPlaces));
  };

  const substitutionTotal = (setNumber) => selectedDopants.reduce(
    (sum, element) => sum + Number(concentrationSets[setNumber]?.[element] || 0), 0
  );

  const calculateMassesForSet = (setNumber, targetMetalMol) => {
    const masses = {};
    const concentrations = {};

    selectedRareEarths.forEach((element) => {
      const concentration = Number(concentrationSets[setNumber]?.[element] || 0);
      concentrations[element] = concentration;
      masses[RARE_EARTH_DOPANTS[element]] = (targetMetalMol * concentration / 100 / 2) * MATERIALS[RARE_EARTH_DOPANTS[element]];
    });

    selectedOtherSubstituents.forEach((element) => {
      const concentration = Number(concentrationSets[setNumber]?.[element] || 0);
      concentrations[element] = concentration;
      masses[OTHER_SUBSTITUENTS[element]] = (targetMetalMol * concentration / 100 / 2) * MATERIALS[OTHER_SUBSTITUENTS[element]];
    });

    const hostConcentration = 100 - substitutionTotal(setNumber);
    concentrations[compound.hostElement] = hostConcentration;
    concentrations.V = 100;
    masses[compound.hostOxide] = (targetMetalMol * hostConcentration / 100 / 2) * MATERIALS[compound.hostOxide];
    masses["V₂O₅"] = (targetMetalMol / 2) * MATERIALS["V₂O₅"];
    return { masses, concentrations };
  };

  const calculateMasses = () => {
    const targetMetalMol = Number(targetMol);
    if (!Number.isFinite(targetMetalMol) || targetMetalMol <= 0) {
      setErrorMessage("目標モル数は0より大きい数値を入力してください。");
      return;
    }
    const invalidSet = setNumbers.find((setNumber) => substitutionTotal(setNumber) > 100);
    if (invalidSet) {
      setErrorMessage(`セット ${invalidSet} の置換濃度の合計が100%を超えています。`);
      return;
    }

    setErrorMessage("");
    setResults(Object.fromEntries(
      setNumbers.map((setNumber) => [setNumber, calculateMassesForSet(setNumber, targetMetalMol)])
    ));
  };

  const formatValue = (value) => Number(value || 0).toFixed(decimalPlaces);
  const formatPercentage = (value) => formatDisplayNumber(value, decimalPlaces);

  const updateMeasuredValue = (setNumber, material, value) => {
    setMeasuredValues((current) => ({
      ...current,
      [setNumber]: { ...current[setNumber], [material]: value },
    }));
  };

  const adjustMeasuredValue = (setNumber, material, direction) => {
    const current = Number(measuredValues[setNumber]?.[material] || 0);
    const factor = 10 ** adjustmentPrecision;
    const next = Math.max(0, Math.round((current + adjustmentStepNumber * direction + Number.EPSILON) * factor) / factor);
    updateMeasuredValue(setNumber, material, next.toFixed(adjustmentPrecision));
  };

  const updateAdjustmentStep = (rawValue) => {
    const normalized = rawValue.replace(",", ".");
    if (!/^\d*(?:\.\d{0,8})?$/.test(normalized)) return;
    setAdjustmentStep(normalized);
  };

  const normalizeAdjustmentStep = () => {
    if (!Number.isFinite(Number(adjustmentStep)) || Number(adjustmentStep) <= 0) {
      setAdjustmentStep(DEFAULT_ADJUSTMENT_STEP);
    }
  };

  const matchCalculatedValue = (setNumber, material, calculated) => {
    updateMeasuredValue(setNumber, material, formatValue(calculated));
  };

  const toggleWeighted = (setNumber, material) => {
    setWeightedMaterials((current) => ({
      ...current,
      [setNumber]: {
        ...current[setNumber],
        [material]: !current[setNumber]?.[material],
      },
    }));
  };

  const resetAll = () => {
    setSelectedCompound("yvo4");
    setSelectedDopants([]);
    setTargetMol("0.004");
    setSetCount(DEFAULT_SET_COUNT);
    setDecimalPlaces(DEFAULT_DECIMAL_PLACES);
    setAdjustmentStep(DEFAULT_ADJUSTMENT_STEP);
    setConcentrationSets(makeEmptySets(DEFAULT_SET_COUNT));
    setMeasuredValues(makeEmptySets(DEFAULT_SET_COUNT));
    setWeightedMaterials(makeEmptySets(DEFAULT_SET_COUNT));
    setResults(null);
    setErrorMessage("");
    stockState.setData((current) => ({ ...current, delivery: {}, drafts: {} }));
  };

  const exportToCSV = () => {
    if (!results) return;
    const rows = [["化合物", "セット", "材料", "計算値 (g)", "測定値 (g)", "秤量済み", "添加方法", "ストックID", "使用ストック", "金属濃度 (mol/L)", "理論分取 (µL)", "設定・分取 (µL)", "追加硝酸・理論 (mL)", "備考"]];
    setNumbers.forEach((setNumber) => {
      const lines = setStockLines(stockState.data, results[setNumber].masses, MATERIALS, setNumber, targetMol, {compound:compound.formula,concentrations:results[setNumber].concentrations});
      const budget = liquidBudget(targetMol, lines.map(line => line.invalid ? NaN : line.actualUl));
      Object.entries(results[setNumber].masses).forEach(([material, calculated]) => {
        const line = lines.find(item => item.material === material);
        rows.push([
          compound.formula,
          setNumber,
          material,
          formatValue(calculated),
          line ? "" : measuredValues[setNumber]?.[material] || "",
          line ? "使用履歴を参照" : weightedMaterials[setNumber]?.[material] ? "はい" : "いいえ",
          line ? "ストック" : "粉末", line?.stock?.id || "", line?.stock?.name || "",
          line?.stock ? concentration(line.stock) : "", line?.plan?.idealUl ?? "",
          line && !line.invalid ? line.actualUl : "",
          budget.unresolved ? "未確定" : budget.remainingMl,
          line?.plan?.error || (budget.over ? "液量上限超過" : budget.unresolved ? "分取条件未確定" : ""),
        ]);
      });
    });
    downloadFile(`${compound.filePrefix}_measurements_${targetMol}mol.csv`, "\ufeff" + rows.map(row => row.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  };

  const reagentAmounts = React.useMemo(() => {
    const ratio = Number(targetMol || 0) / BASE_METAL_MOL;
    return {
      "添加液量の上限（ストック＋追加硝酸）": `${(5 * ratio).toFixed(3)} mL`,
      "純水": `${(40 * ratio).toFixed(2)} ml`,
      "クエン酸水和物": `${(3.3622 * ratio).toFixed(4)} g`,
      "プロピレングリコール": `${(1.17 * ratio).toFixed(2)} ml`,
    };
  }, [targetMol]);

  const activeMaterials = React.useMemo(() => {
    const names = ["V₂O₅", compound.hostOxide, ...selectedDopants.map((element) => ALL_ADDITIVES[element])];
    return [...new Set(names)];
  }, [compound.hostOxide, selectedDopants]);

  return (
    <main className="calculator-page">
      <div className="app-shell">
        <header className="page-header">
          <a className="page-brand" href="/" aria-label="秤量計算ツールのトップへ">
            <Image
              className="page-brand-icon"
              src="/yvo4_gdvo4_weighing_icon.svg"
              width="48"
              height="48"
              alt=""
              priority
              unoptimized
            />
            <span className="page-brand-copy">
              <strong>Weighing Calculator</strong>
              <small>YVO₄ / GdVO₄</small>
            </span>
          </a>
        </header>

        <section className="app-header" aria-labelledby="calculator-title">
          <div>
            <p className="eyebrow">CITRATE COMPLEX METHOD</p>
            <h1 id="calculator-title">YVO₄ / GdVO₄ 秤量計算ツール</h1>
            <p>母体材料を選び、添加濃度と秤量値をセットごとにまとめて管理できます。</p>
          </div>
          <div className="current-compound-card">
            <span>現在の母体材料</span>
            <strong>{compound.formula}</strong>
          </div>
        </section>

        <nav className="workspace-tabs" aria-label="計算ツールの画面">
          <button type="button" aria-pressed={activeView === "calculator"} className={activeView === "calculator" ? "is-active" : ""} onClick={() => setActiveView("calculator")}>組成・秤量計算</button>
          <button type="button" aria-pressed={activeView === "stocks"} className={activeView === "stocks" ? "is-active" : ""} onClick={() => setActiveView("stocks")}>ストック溶液</button>
        </nav>
        {stockState.storageError && <p className="stock-warning" role="alert">{stockState.storageError}</p>}
        <div hidden={activeView !== "stocks"}><StockManager /></div>
        <div hidden={activeView !== "calculator"}>
        <div className="workspace-grid">
          <aside className="settings-panel" aria-label="計算設定">
            <div className="setting-field">
              <span className="setting-label">母体材料</span>
              <div className={`compound-toggle ${selectedCompound === "gdvo4" ? "is-second-selected" : ""}`} role="radiogroup" aria-label="母体材料">
                {Object.values(COMPOUNDS).map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    id={`compound-${item.key}`}
                    role="radio"
                    aria-checked={selectedCompound === item.key}
                    className={selectedCompound === item.key ? "is-selected" : ""}
                    onClick={() => switchCompound(item.key)}
                    onKeyDown={(event) => {
                      const previousKeys = ["ArrowLeft", "ArrowUp", "Home"];
                      const nextKeys = ["ArrowRight", "ArrowDown", "End"];
                      if (!previousKeys.includes(event.key) && !nextKeys.includes(event.key)) return;
                      event.preventDefault();
                      const nextKey = previousKeys.includes(event.key) ? "yvo4" : "gdvo4";
                      switchCompound(nextKey);
                      requestAnimationFrame(() => document.getElementById(`compound-${nextKey}`)?.focus());
                    }}
                  >
                    {item.formula}
                  </button>
                ))}
              </div>
            </div>

            <label className="setting-field">
              <span className="setting-label">目標モル数</span>
              <span className="unit-field">
                <input
                  aria-label="目標モル数"
                  type="text"
                  inputMode="decimal"
                  value={targetMol}
                  onChange={(event) => {
                    if (/^\d*(?:\.\d*)?$/.test(event.target.value)) {
                      setTargetMol(event.target.value);
                      setResults(null);
                    }
                  }}
                />
                <span>mol</span>
              </span>
            </label>

            <div className="settings-pair">
              <StepperField
                label="小数点以下の桁数"
                value={decimalPlaces}
                min={0}
                max={8}
                onChange={(value) => { setDecimalPlaces(value); setResults(null); }}
                help="0〜8桁"
              />
              <StepperField
                label="セット数"
                value={setCount}
                min={1}
                max={20}
                onChange={updateSetCount}
                help="1〜20セット"
              />
            </div>

            <div className="desktop-actions">
              <button type="button" className="primary-button" onClick={calculateMasses}>計算する</button>
              <button type="button" className="secondary-button" onClick={resetAll}>入力をリセット</button>
            </div>
          </aside>

          <div className="main-workspace">
            <section className="section-block element-section">
              <div className="section-heading">
                <div>
                  <h2>置換元素の選択</h2>
                  <p>使用する元素だけを選択してください。</p>
                </div>
                <button type="button" className="text-button" onClick={() => setShowMaterials((value) => !value)}>
                  {showMaterials ? "分子量を隠す" : "分子量を表示"}
                </button>
              </div>

              <div className="element-group">
                <h3>希土類元素（母体材料サイト置換）</h3>
                <div className="element-grid">
                  {availableRareEarths.map((element) => (
                    <ElementButton
                      key={element}
                      element={element}
                      selected={selectedDopants.includes(element)}
                      onClick={() => toggleDopant(element)}
                    />
                  ))}
                </div>
              </div>

              <div className="element-group other-elements">
                <h3>その他の置換元素</h3>
                <ElementButton
                  element="Bi"
                  selected={selectedDopants.includes("Bi")}
                  onClick={() => toggleDopant("Bi")}
                />
                <p className="info-note"><span aria-hidden="true">i</span>Biは希土類元素ではありませんが、母体材料サイトを置換します。</p>
              </div>

              {showMaterials && (
                <div className="molar-mass-list">
                  {activeMaterials.map((material) => (
                    <span key={material}><strong>{material}</strong>{MATERIALS[material]} g/mol</span>
                  ))}
                </div>
              )}
            </section>

            <section className="section-block concentration-section">
              <div className="section-heading">
                <div>
                  <h2>添加濃度（各セット）</h2>
                  <p>矢印キーまたは±ボタンで {formatPercentage(concentrationStep)}% ずつ調整できます。</p>
                </div>
                <span className="host-balance-label">母体材料の酸化物 {compound.hostOxide}</span>
              </div>

              <div className="concentration-table" role="table" aria-label="添加濃度">
                <div className="concentration-header" role="row">
                  <span>セット</span><span>濃度（%）</span><span>母体材料比率</span>
                </div>
                {setNumbers.map((setNumber) => (
                  <div className="concentration-row" role="row" key={setNumber}>
                    <strong>{setNumber}</strong>
                    <div className="concentration-inputs">
                      {selectedDopants.length === 0 ? (
                        <span className="empty-state">添加元素なし（純粋系）</span>
                      ) : selectedDopants.map((element) => (
                        <label key={element}>
                          <span>{element}</span>
                          <span className="compact-number-field">
                            <input
                              aria-label={`セット ${setNumber} ${element} 濃度`}
                              type="text"
                              inputMode="decimal"
                              value={concentrationSets[setNumber]?.[element] ?? ""}
                              onChange={(event) => updateConcentration(setNumber, element, event.target.value)}
                              onBlur={() => normalizeConcentration(setNumber, element)}
                              onKeyDown={(event) => {
                                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                                  event.preventDefault();
                                  incrementConcentration(setNumber, element, event.key === "ArrowUp" ? 1 : -1);
                                }
                              }}
                            />
                            <button type="button" aria-label={`${element}を減らす`} onClick={() => incrementConcentration(setNumber, element, -1)}>−</button>
                            <button type="button" aria-label={`${element}を増やす`} onClick={() => incrementConcentration(setNumber, element, 1)}>＋</button>
                          </span>
                        </label>
                      ))}
                    </div>
                    <span className="host-balance">{compound.hostElement} {formatPercentage(100 - substitutionTotal(setNumber))}%</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="mobile-actions">
              <button type="button" className="primary-button" onClick={calculateMasses}>計算する</button>
              <button type="button" className="secondary-button" onClick={resetAll}>入力をリセット</button>
            </div>

            {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
          </div>
        </div>

        {results && (
          <section className="results-section">
            <div className="results-heading">
              <div>
                <h2>計算結果</h2>
                <p>{compound.formula}・目標モル数 {targetMol} mol・{setCount}セット</p>
              </div>
              <button type="button" className="secondary-button csv-button" onClick={exportToCSV}>CSV出力</button>
            </div>
            <p className="adjustment-guide">微調整の中央の数値を変更すると、±ボタンと実測値の矢印キーの増減幅が変わります。</p>

            <div className="result-set-list">
              {setNumbers.map((setNumber) => {
                const lines = setStockLines(stockState.data, results[setNumber].masses, MATERIALS, setNumber, targetMol, {compound:compound.formula,concentrations:results[setNumber].concentrations});
                const budget = liquidBudget(targetMol, lines.map(line => line.invalid ? NaN : line.actualUl));
                return (
                <article className="result-set" key={setNumber}>
                  <div className="result-set-title">
                    <h3>セット {setNumber}</h3>
                    <span>{selectedDopants.length ? selectedDopants.map((element) => `${element} ${formatPercentage(concentrationSets[setNumber]?.[element] || 0)}%`).join(" / ") : "純粋系"}</span>
                  </div>
                  <div className="result-table" role="table" aria-label={`セット ${setNumber} の秤量結果`}>
                    <div className="result-header" role="row">
                      <span>試薬</span><span>計算値</span><span>実測値</span><span>秤量済み</span><span>微調整</span>
                    </div>
                    {Object.entries(results[setNumber].masses).map(([material, calculated]) => {
                      const line = lines.find(item => item.material === material);
                      const element = material === compound.hostOxide ? compound.hostElement : Object.keys(ALL_ADDITIVES).find(key => ALL_ADDITIVES[key] === material);
                      return (
                      <div className="result-row" role="row" key={material}>
                        <strong className="material-name">{material}</strong>
                        <span className="calculated-value">{formatValue(calculated)} g</span>
                        {element && <DeliverySelector material={material} element={element} />}
                        {line ? <StockDose line={line} budget={budget} targetMol={targetMol} setNumber={setNumber} /> : <>
                        <div className="measured-field">
                          <span className="mobile-only-label">実測値</span>
                          <input
                            aria-label={`セット ${setNumber} ${material} 実測値`}
                            type="number"
                            min="0"
                            step={adjustmentStepNumber}
                            value={measuredValues[setNumber]?.[material] ?? ""}
                            placeholder={formatValue(calculated)}
                            onChange={(event) => updateMeasuredValue(setNumber, material, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                                event.preventDefault();
                                adjustMeasuredValue(setNumber, material, event.key === "ArrowUp" ? 1 : -1);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="match-button"
                            onClick={() => matchCalculatedValue(setNumber, material, calculated)}
                          >
                            ぴったり
                          </button>
                        </div>
                        <div className="adjustment-field">
                          <span className="mobile-only-label">微調整</span>
                          <div className="fine-adjustment" aria-label="実測値を微調整">
                            <button type="button" aria-label={`${material}を減らす`} onClick={() => adjustMeasuredValue(setNumber, material, -1)}>−</button>
                            <input
                              aria-label="微調整幅（g）"
                              type="text"
                              inputMode="decimal"
                              value={adjustmentStep}
                              onChange={(event) => updateAdjustmentStep(event.target.value)}
                              onBlur={normalizeAdjustmentStep}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur();
                              }}
                            />
                            <button type="button" aria-label={`${material}を増やす`} onClick={() => adjustMeasuredValue(setNumber, material, 1)}>＋</button>
                          </div>
                          <label className="weighted-check">
                            <input
                              aria-label={`セット ${setNumber} ${material} 秤量済み`}
                              type="checkbox"
                              checked={Boolean(weightedMaterials[setNumber]?.[material])}
                              onChange={() => toggleWeighted(setNumber, material)}
                            />
                            <span>完了</span>
                          </label>
                        </div>
                        </>}
                      </div>
                    );})}
                  </div>
                  <StockBudget budget={budget} />
                </article>
              );})}
            </div>

            <div className="reagent-section">
              <div>
                <h3>必要な試薬量</h3>
                <p>目標モル数に合わせた目安です。追加硝酸量は各セットの液量欄を確認してください。</p>
              </div>
              <dl>
                {Object.entries(reagentAmounts).map(([name, amount]) => (
                  <div key={name}><dt>{name}</dt><dd>{amount}</dd></div>
                ))}
              </dl>
              <button type="button" className="text-button" onClick={() => setShowDetails((value) => !value)}>
                {showDetails ? "計算条件を閉じる" : "計算条件を確認"}
              </button>
              {showDetails && (
                <CalculationBreakdown
                  compound={compound}
                  results={results}
                  selectedDopants={selectedDopants}
                  concentrationSets={concentrationSets}
                  setNumbers={setNumbers}
                  targetMol={targetMol}
                  formatValue={formatValue}
                  formatPercentage={formatPercentage}
                />
              )}
            </div>
          </section>
        )}
        </div>

        <footer>
          <a href="https://github.com/Kou-256/weighing-calculator" target="_blank" rel="noreferrer">
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <span>Created by Kou Hashizume</span>
        </footer>
      </div>
    </main>
  );
}

export default function Calculator() {
  return <StockProvider><MainComponent /></StockProvider>;
}
