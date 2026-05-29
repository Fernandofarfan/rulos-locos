import { lazy, useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { HeroCard } from './components/HeroCard';
import { StatsCard } from './components/StatsCard';
import { SectionDivider } from './components/SectionDivider';
import { SectionSkeleton } from './components/ui/SectionSkeleton';
import { SectionReveal } from './components/ui/SectionReveal';
import { RevealSuspense } from './components/ui/RevealSuspense';
import { useDashboardData } from './hooks/useDashboardData';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLiveBlue } from './hooks/useLiveBlue';
import { useSettings } from './hooks/useSettings';
import { formatPct, formatInt, formatCompact } from './utils/formatARS';
import { TrendingUp, Activity, ShieldCheck, BarChart3, Landmark, Zap, Wrench, LineChart, Newspaper } from 'lucide-react';
import { WatchlistPanel } from './components/WatchlistPanel';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { KioskButton, KioskMode } from './components/KioskMode';
import { ToastContainer } from './components/ToastContainer';
import { FinancialGlossary } from './components/FinancialGlossary';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { ReloadPrompt } from './components/ReloadPrompt';
import { OnboardingTour } from './components/OnboardingTour';
import { MobileNavBar } from './components/MobileNavBar';
import { PanicBoard } from './components/PanicBoard';
import { AchievementSystem } from './components/AchievementSystem';
import { AIChat } from './components/AIChat';
import { CommandPalette } from './components/CommandPalette';
import { AdminDashboard } from './components/AdminDashboard';
import { FocusMode } from './components/FocusMode';
import { useTabTitle } from './hooks/useTabTitle';
import { useAuth } from './hooks/useAuth';
import { LandingPage } from './components/LandingPage';

// ── Sección 1: Dashboard (complementos lazy) ─────────────────────────────────
const MacroDashboard = lazy(() => import('./components/MacroDashboard').then(m => ({ default: m.MacroDashboard })));
const SmartInsight = lazy(() => import('./components/SmartInsight').then(m => ({ default: m.SmartInsight })));
const BrechaMonitor = lazy(() => import('./components/BrechaMonitor').then(m => ({ default: m.BrechaMonitor })));

// ── Sección 2: Tasas & Mercado ────────────────────────────────────────────────
const LiveBondsPanel = lazy(() => import('./components/LiveBondsPanel').then(m => ({ default: m.LiveBondsPanel })));
const InterestRates = lazy(() => import('./components/InterestRates').then(m => ({ default: m.InterestRates })));
const EquilibriumDollar = lazy(() => import('./components/EquilibriumDollar').then(m => ({ default: m.EquilibriumDollar })));
const ReservasBCRA = lazy(() => import('./components/ReservasBCRA').then(m => ({ default: m.ReservasBCRA })));
const InflationBreakdown = lazy(() => import('./components/InflationBreakdown').then(m => ({ default: m.InflationBreakdown })));
const PlazoFijoBancos = lazy(() => import('./components/PlazoFijoBancos').then(m => ({ default: m.PlazoFijoBancos })));
const FCIMoneyMarket = lazy(() => import('./components/FCIMoneyMarket').then(m => ({ default: m.FCIMoneyMarket })));

// ── Sección 3: Arbitraje ──────────────────────────────────────────────────────
const ArbitrageHub = lazy(() => import('./components/ArbitrageHub').then(m => ({ default: m.ArbitrageHub })));
const ArbitrageCalculator = lazy(() => import('./components/ArbitrageCalculator').then(m => ({ default: m.ArbitrageCalculator })));
const PriceAlerts = lazy(() => import('./components/PriceAlerts').then(m => ({ default: m.PriceAlerts })));
const PlatformList = lazy(() => import('./components/PlatformList').then(m => ({ default: m.PlatformList })));

// ── Sección 4: Herramientas ───────────────────────────────────────────────────
const RealRateCalculator = lazy(() => import('./components/RealRateCalculator').then(m => ({ default: m.RealRateCalculator })));
const InstrumentComparer = lazy(() => import('./components/InstrumentComparer').then(m => ({ default: m.InstrumentComparer })));
const BondCalculator = lazy(() => import('./components/BondCalculator').then(m => ({ default: m.BondCalculator })));
const InflationCalculator = lazy(() => import('./components/InflationCalculator').then(m => ({ default: m.InflationCalculator })));
const CERCalculator = lazy(() => import('./components/CERCalculator').then(m => ({ default: m.CERCalculator })));
const UVALoanSimulator = lazy(() => import('./components/UVALoanSimulator').then(m => ({ default: m.UVALoanSimulator })));

// ── Sección 5: Análisis ───────────────────────────────────────────────────────
const ChartCard = lazy(() => import('./components/ChartCard').then(m => ({ default: m.ChartCard })));
const YieldCurve = lazy(() => import('./components/YieldCurve').then(m => ({ default: m.YieldCurve })));
const CorrelationHeatmap = lazy(() => import('./components/CorrelationHeatmap').then(m => ({ default: m.CorrelationHeatmap })));
const AssetComparer = lazy(() => import('./components/AssetComparer').then(m => ({ default: m.AssetComparer })));
const CarryTradeMonitor = lazy(() => import('./components/CarryTradeMonitor').then(m => ({ default: m.CarryTradeMonitor })));

// ── Sección 6: Portfolio ──────────────────────────────────────────────────────
const PortfolioTracker = lazy(() => import('./components/PortfolioTracker').then(m => ({ default: m.PortfolioTracker })));
const NewsFeed = lazy(() => import('./components/NewsFeed').then(m => ({ default: m.NewsFeed })));
const EconomicCalendar = lazy(() => import('./components/EconomicCalendar').then(m => ({ default: m.EconomicCalendar })));
const CommoditiesMonitor = lazy(() => import('./components/CommoditiesMonitor').then(m => ({ default: m.CommoditiesMonitor })));
const ROFEXPanel = lazy(() => import('./components/ROFEXPanel').then(m => ({ default: m.ROFEXPanel })));
const CedearsPanel = lazy(() => import('./components/CedearsPanel').then(m => ({ default: m.CedearsPanel })));
const CryptoDashboard = lazy(() => import('./components/CryptoDashboard').then(m => ({ default: m.CryptoDashboard })));
const SavingsCalculator = lazy(() => import('./components/SavingsCalculator').then(m => ({ default: m.SavingsCalculator })));
const DolarConvergencia = lazy(() => import('./components/DolarConvergencia').then(m => ({ default: m.DolarConvergencia })));
const MervalTop20 = lazy(() => import('./components/MervalTop20').then(m => ({ default: m.MervalTop20 })));
const IntradayBlueChart = lazy(() => import('./components/IntradayBlueChart').then(m => ({ default: m.IntradayBlueChart })));
const RendimientoComparador = lazy(() => import('./components/RendimientoComparador').then(m => ({ default: m.RendimientoComparador })));
const SmartRecommendation = lazy(() => import('./components/SmartRecommendation').then(m => ({ default: m.SmartRecommendation })));
const FuturosRofex = lazy(() => import('./components/FuturosRofex').then(m => ({ default: m.FuturosRofex })));
// ── Fase 5 ──────────────────────────────────────────────────────────────────
const SpreadTracker = lazy(() => import('./components/SpreadTracker').then(m => ({ default: m.SpreadTracker })));
const PricePredictor = lazy(() => import('./components/PricePredictor').then(m => ({ default: m.PricePredictor })));
const TaxCalculator = lazy(() => import('./components/TaxCalculator').then(m => ({ default: m.TaxCalculator })));
const MultiCurrencyComparator = lazy(() => import('./components/MultiCurrencyComparator').then(m => ({ default: m.MultiCurrencyComparator })));
// ── Fase 6 ──────────────────────────────────────────────────────────────────
const HistoricalBlueChart = lazy(() => import('./components/HistoricalBlueChart').then(m => ({ default: m.HistoricalBlueChart })));
const WhatIfSimulator = lazy(() => import('./components/WhatIfSimulator').then(m => ({ default: m.WhatIfSimulator })));
const TimeMachine = lazy(() => import('./components/TimeMachine').then(m => ({ default: m.TimeMachine })));
const SalaryCalculator = lazy(() => import('./components/SalaryCalculator').then(m => ({ default: m.SalaryCalculator })));
const CanastaEnDolares = lazy(() => import('./components/CanastaEnDolares').then(m => ({ default: m.CanastaEnDolares })));
// ── Fase 7 ──────────────────────────────────────────────────────────────────
const PortfolioManager = lazy(() => import('./components/PortfolioManager').then(m => ({ default: m.PortfolioManager })));
const GoalPlanner = lazy(() => import('./components/GoalPlanner').then(m => ({ default: m.GoalPlanner })));
const RulosMatrix = lazy(() => import('./components/RulosMatrix').then(m => ({ default: m.RulosMatrix })));
const PaperTrading = lazy(() => import('./components/PaperTrading').then(m => ({ default: m.PaperTrading })));
const DolarTarjetaCalculator = lazy(() => import('./components/DolarTarjetaCalculator').then(m => ({ default: m.DolarTarjetaCalculator })));
const LoanSimulator = lazy(() => import('./components/LoanSimulator').then(m => ({ default: m.LoanSimulator })));
const MarketSentiment = lazy(() => import('./components/MarketSentiment').then(m => ({ default: m.MarketSentiment })));
// ── Mejoras ────────────────────────────────────────────────────────────────
const RuloScanner = lazy(() => import('./components/RuloScanner').then(m => ({ default: m.RuloScanner })));
const RuloDelDia = lazy(() => import('./components/RuloDelDia').then(m => ({ default: m.RuloDelDia })));
const CorrelacionDolarInflacion = lazy(() => import('./components/CorrelacionDolarInflacion').then(m => ({ default: m.CorrelacionDolarInflacion })));
const StatusPage = lazy(() => import('./components/StatusPage').then(m => ({ default: m.StatusPage })));
// ── Fase 13 ────────────────────────────────────────────────────────────────────
const RuloBacktester = lazy(() => import('./components/RuloBacktester').then(m => ({ default: m.RuloBacktester })));
const ReturnComparator = lazy(() => import('./components/ReturnComparator').then(m => ({ default: m.ReturnComparator })));

function App() {
  const { rate, arbitrage, economics, loading, rateChange } = useDashboardData();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [kioskActive, setKioskActive] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [focusActive, setFocusActive] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const visited = localStorage.getItem('rl_visited');
    if (!visited && !isAuthenticated) {
      setShowLanding(true);
    }
  }, [isAuthenticated]);

  const dismissLanding = () => {
    localStorage.setItem('rl_visited', '1');
    setShowLanding(false);
  };

  const { soundEnabled, voiceEnabled, alertThresholdPct } = useSettings();

  // Live Blue via WebSocket — fires sound + toast + voice on significant price changes
  useLiveBlue({ alertThresholdPct, soundEnabled, voiceEnabled });

  // Show Blue price in browser tab title + dynamic favicon
  const bluePrice = arbitrage?.dolares?.blue?.venta ?? 0;
  useTabTitle(bluePrice, rateChange ?? 0);

  useKeyboardShortcuts({
    onSearch: () => setSearchOpen(prev => !prev),
    onEscape: () => { setShortcutsOpen(false); setSearchOpen(false); setKioskActive(false); setGlossaryOpen(false); setFocusActive(false); },
    onPDF: () => document.getElementById('pdf-trigger')?.click(),
  });

  // Watchlist assets derived from live data
  const watchlistAssets = [
    { id: 'blue', label: 'Dólar Blue', price: arbitrage?.dolares?.blue?.venta, change: rateChange },
    { id: 'mep', label: 'Dólar MEP', price: arbitrage?.dolares?.mep?.venta, change: undefined },
    { id: 'ccl', label: 'Dólar CCL', price: arbitrage?.dolares?.ccl?.venta, change: undefined },
    { id: 'oficial', label: 'Dólar Oficial', price: arbitrage?.dolares?.oficial?.venta, change: undefined },
    { id: 'cripto', label: 'USDT', price: rate?.ask, change: undefined },
  ];

  if (showLanding) {
    return <LandingPage onEnter={dismissLanding} />;
  }

  if (loading && !rate) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-app flex-col gap-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-accent-primary/20 rounded-full animate-ping"></div>
          <div className="absolute inset-0 border-4 border-t-accent-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-accent-primary animate-pulse text-xs font-bold tracking-[0.3em] uppercase">Inicializando Sistema</p>
          <p className="text-slate-500 text-[10px] tracking-wider">Cargando datos de mercado...</p>
        </div>
      </div>
    );
  }

  // Toggle Focus Mode with 'F' key
  if (focusActive) {
    return (
      <FocusMode
        bluePrice={bluePrice}
        mepPrice={arbitrage?.dolares?.mep?.venta ?? 0}
        usdtPrice={rate?.ask ?? 0}
        blueTrend={rateChange}
        onClose={() => setFocusActive(false)}
      />
    );
  }

  return (
    <>
      <Layout activeView={activeView} onViewChange={setActiveView}>
        <div className="pb-16 animate-fade-in relative z-10 space-y-0">

          {/* Watchlist de favoritos (aparece solo si el usuario tiene algo guardado) */}
          <WatchlistPanel availableAssets={watchlistAssets} />

          {/* ═══════════════════════════════════════════════
            SECCIÓN 1: DASHBOARD PRINCIPAL
        ══════════════════════════════════════════════ */}
          {activeView === 'dashboard' && (
            <div className="animate-fade-in">
              <SectionDivider
                id="dashboard"
                icon={BarChart3}
                title="Dashboard"
                description="Panorama en tiempo real del mercado cambiario argentino"
                badge="LIVE"
                badgeColor="blue"
              />

              <SectionReveal delay={80}>
                <PanicBoard
                  riskCountry={economics?.macro?.risk ?? 0}
                  bluePrice={arbitrage?.dolares?.blue?.venta ?? 0}
                  previousBluePrice={0}
                  onDismiss={() => {}}
                />
                <div className="grid grid-cols-12 gap-6 pt-6 pb-4 scroll-mt-32">
                  <div className="col-span-12 lg:col-span-8 h-full min-h-[280px]">
                    <HeroCard
                      price={arbitrage?.dolares?.blue?.venta || 0}
                      bid={arbitrage?.dolares?.blue?.compra || undefined}
                      source="Dólar Blue"
                      loading={loading}
                      trend={rateChange}
                      updatedAt={new Date().toISOString()}
                    />
                  </div>
                  <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 justify-between h-full">
                    <StatsCard
                      label="Inflación Interanual"
                      value={formatPct(economics?.macro?.inflation?.interanual)}
                      subValue={economics?.macro?.inflation?.mensual != null
                        ? `${economics.macro.inflation.mensual.toFixed(1)}% mensual`
                        : 'Dato Oficial INDEC'}
                      icon={TrendingUp}
                      trend="up"
                      trendValue={economics?.macro?.inflation?.mensual != null
                        ? `${economics.macro.inflation.mensual.toFixed(1)}% m/m`
                        : undefined}
                      color="text-warning"
                    />
                    <StatsCard
                      label="Riesgo País"
                      value={economics?.macro?.risk ? `${formatInt(Number(economics.macro.risk))} pts` : '--'}
                      subValue="J.P. Morgan Index"
                      icon={Activity}
                      trend={economics?.macro?.risk ? (Number(economics.macro.risk) > 1000 ? 'up' : 'down') : 'neutral'}
                      trendValue={economics?.macro?.risk ? `${formatInt(Number(economics.macro.risk))} pb` : undefined}
                      color="text-success"
                    />
                    <StatsCard
                      label="Reservas BCRA"
                      value={formatCompact(economics?.macro?.reserves, '$ ')}
                      subValue="Reservas Brutas USD"
                      icon={ShieldCheck}
                      trend="neutral"
                      color="text-info"
                    />
                  </div>
                </div>
              </SectionReveal>

              <RevealSuspense fallback={<SectionSkeleton cards={2} cols={2} height="h-40" />}>
                <div className="space-y-6 pb-4">
                  {/* AI Macro Analyzer */}
                  <SmartInsight />

                  <MacroDashboard />
                  <BrechaMonitor />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <MarketSentiment />
                    <div className="lg:col-span-2">
                      <IntradayBlueChart />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DolarConvergencia />
                    <HistoricalBlueChart currentBlue={arbitrage?.dolares?.blue?.venta} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RuloScanner />
                    <RuloDelDia />
                  </div>
                  <FuturosRofex />
                </div>
              </RevealSuspense>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
            SECCIÓN 2: TASAS & MERCADO
        ══════════════════════════════════════════════ */}
          {activeView === 'mercado' && (
            <div className="animate-fade-in">
              <SectionDivider
                id="mercado"
                icon={Landmark}
                title="Tasas & Mercado"
                description="Tasas de interés, reservas, inflación, plazo fijo y fondos de inversión"
                badge="BCRA · INDEC"
                badgeColor="emerald"
              />

              <RevealSuspense fallback={<SectionSkeleton cards={4} cols={2} height="h-44" />}>
                <div className="space-y-6 pt-6 pb-4">
                  <LiveBondsPanel />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <InterestRates />
                    <EquilibriumDollar />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ReservasBCRA />
                    <InflationBreakdown />
                  </div>
                  <div id="cotizaciones" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-32">
                    <PlazoFijoBancos />
                    <FCIMoneyMarket />
                  </div>
                  <CommoditiesMonitor />
                  <ROFEXPanel />
                  <CryptoDashboard cclRate={arbitrage?.dolares?.ccl?.venta ?? 1200} />
                  <CedearsPanel cclRate={arbitrage?.dolares?.ccl?.venta ?? 1200} />
                  <MervalTop20 />
                </div>
              </RevealSuspense>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
            SECCIÓN 3: ARBITRAJE & COTIZACIONES
        ══════════════════════════════════════════════ */}
          {activeView === 'arbitrage' && (
            <div className="animate-fade-in">
              <SectionDivider
                id="arbitrage"
                icon={Zap}
                title="Arbitraje & Cotizaciones"
                description="Oportunidades de arbitraje en tiempo real entre tipos de cambio"
                badge="REAL-TIME"
                badgeColor="amber"
              />

              <RevealSuspense fallback={<SectionSkeleton cards={2} cols={2} height="h-[520px]" />}>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-6 pb-4 items-start">
                  {/* Hub de arbitraje */}
                  <div className="xl:col-span-8 h-[520px]">
                    <ArbitrageHub
                      opportunities={arbitrage?.opportunities ?? []}
                      history={arbitrage?.history ?? []}
                      loading={loading}
                    />
                  </div>

                  {/* Panel lateral: solo calculadora + alertas + cotizaciones */}
                  <div className="xl:col-span-4 flex flex-col gap-4">
                    <ArbitrageCalculator
                      blueBid={arbitrage?.dolares?.blue?.compra ?? 0}
                      mepAsk={arbitrage?.dolares?.mep?.venta ?? 0}
                      cryptoAsk={rate?.ask ?? 0}
                      loading={loading}
                    />
                    <PriceAlerts
                      prices={{
                        blue: arbitrage?.dolares?.blue?.venta ?? 0,
                        mep: arbitrage?.dolares?.mep?.venta ?? 0,
                        oficial: arbitrage?.dolares?.oficial?.venta ?? 0,
                        crypto: rate?.ask ?? 0
                      }}
                    />
                    <PlatformList
                      platforms={arbitrage?.dolares ? [
                        { name: 'Dólar MEP', ask: arbitrage.dolares.mep?.venta ?? 0, icon: '🏦' },
                        { name: 'Dólar CCL', ask: arbitrage.dolares.ccl?.venta ?? 0, icon: '🌎' },
                        { name: 'Dólar Blue', ask: arbitrage.dolares.blue?.venta ?? 0, icon: '💎' },
                        { name: 'Dólar Cripto', ask: rate?.ask ?? 0, icon: '⚡' },
                        { name: 'Dólar Oficial', ask: arbitrage.dolares.oficial?.venta ?? 0, icon: '🏛️' },
                      ].filter(p => p.ask > 0).sort((a, b) => a.ask - b.ask) : []}
                      loading={loading}
                    />
                    <SpreadTracker dolares={arbitrage?.dolares} loading={loading} />
                    <RulosMatrix />
                  </div>
                </div>
              </RevealSuspense>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
            SECCIÓN 4: HERRAMIENTAS & CALCULADORAS
        ══════════════════════════════════════════════ */}
          {activeView === 'herramientas' && (
            <div className="animate-fade-in">
              <SectionDivider
                id="herramientas"
                icon={Wrench}
                title="Herramientas & Calculadoras"
                description="Calculadoras financieras: bonos, inflación, CER, UVA, tasa real y comparador"
                badgeColor="violet"
              />

              <RevealSuspense fallback={<SectionSkeleton cards={4} cols={2} height="h-48" />}>
                <div className="space-y-6 pt-6 pb-4">
                  {/* Comparadores (ancho completo) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RealRateCalculator />
                    <InstrumentComparer />
                  </div>

                  {/* Calculadoras en grid 2×2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <BondCalculator />
                    <InflationCalculator />
                    <CERCalculator />
                    <UVALoanSimulator />
                  </div>

                  {/* Calculadora de proyección de ahorros */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SavingsCalculator />
                    <GoalPlanner />
                  </div>

                  {/* Comparador rendimientos + Recomendación inteligente */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RendimientoComparador />
                    <SmartRecommendation
                      blue={arbitrage?.dolares?.blue?.venta}
                      oficial={arbitrage?.dolares?.oficial?.venta}
                      mep={arbitrage?.dolares?.mep?.venta}
                      ccl={arbitrage?.dolares?.ccl?.venta}
                      inflation={economics?.macro?.inflation?.mensual ?? 4}
                    />
                  </div>

                  {/* Fase 5: Herramientas adicionales */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TaxCalculator />
                    <MultiCurrencyComparator blueRate={arbitrage?.dolares?.blue?.venta} />
                  </div>

                  {/* Fase 7: Herramientas de Uso Frecuente */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DolarTarjetaCalculator />
                    <LoanSimulator />
                  </div>

                  <PricePredictor currentBlue={arbitrage?.dolares?.blue?.venta} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RuloBacktester />
                    <ReturnComparator />
                  </div>
                  <StatusPage />
                </div>
              </RevealSuspense>

              {/* Fase 6: Simuladores adicionales */}
              <RevealSuspense fallback={<SectionSkeleton cards={3} cols={2} height="h-52" />}>
                <div className="space-y-6 pb-4">
                  <PaperTrading />
                  <TimeMachine />
                  <WhatIfSimulator />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SalaryCalculator />
                    <CanastaEnDolares
                      blue={arbitrage?.dolares?.blue?.venta}
                      oficial={arbitrage?.dolares?.oficial?.venta}
                      mep={arbitrage?.dolares?.mep?.venta}
                      ccl={arbitrage?.dolares?.ccl?.venta}
                    />
                  </div>
                </div>
              </RevealSuspense>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
            SECCIÓN 5: ANÁLISIS TÉCNICO
        ══════════════════════════════════════════════ */}
          {activeView === 'charts' && (
            <div className="animate-fade-in">
              <SectionDivider
                id="charts"
                icon={LineChart}
                title="Análisis Técnico"
                description="Gráficos históricos, curva de rendimientos, correlaciones y carry trade"
                badgeColor="cyan"
              />

              <RevealSuspense fallback={<SectionSkeleton cards={3} cols={3} height="h-64" />}>
                <div className="space-y-6 pt-6 pb-4">
                  {/* Chart cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ChartCard title="Evolución Dólar" indicator="blue" color="#3b82f6" />
                    <ChartCard title="Riesgo País (Histórico)" indicator="risk" color="#ef4444" />
                    <ChartCard title="Evolución Inflación" indicator="inflation" color="#f59e0b" />
                  </div>

                  <YieldCurve />
                  <CorrelationHeatmap />

                  <CorrelacionDolarInflacion />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AssetComparer />
                    <CarryTradeMonitor />
                  </div>
                </div>
              </RevealSuspense>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
            SECCIÓN 6: PORTFOLIO, NOTICIAS & CALENDARIO
        ══════════════════════════════════════════════ */}
          {activeView === 'portfolio' && (
            <div className="animate-fade-in">
              <SectionDivider
                id="portfolio"
                icon={Newspaper}
                title="Portfolio, Noticias & Calendario"
                description="Seguimiento de cartera, noticias financieras y eventos económicos"
                badgeColor="rose"
              />

              <RevealSuspense fallback={<SectionSkeleton cards={3} cols={3} height="h-[600px]" />}>
                <div className="space-y-6 pt-6 pb-4">
                  <PortfolioManager />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <PortfolioTracker
                      currentPrices={{
                        blue: arbitrage?.dolares?.blue?.venta ?? 0,
                        mep: arbitrage?.dolares?.mep?.venta ?? 0,
                        crypto: rate?.ask ?? 0
                      }}
                    />
                    <div id="news" className="scroll-mt-32">
                      <NewsFeed />
                    </div>
                    <div id="calendar" className="scroll-mt-32">
                      <EconomicCalendar />
                    </div>
                  </div>
                </div>
              </RevealSuspense>
            </div>
          )}

        </div>
      </Layout>
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <KioskMode active={kioskActive} onExit={() => setKioskActive(false)} />
      <KioskButton onActivate={() => setKioskActive(true)} />
      <FinancialGlossary open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <ToastContainer />
      <PWAInstallBanner />
      <ReloadPrompt />
      <OnboardingTour onViewChange={setActiveView} />
      <MobileNavBar activeView={activeView} onViewChange={setActiveView} />
      <AIChat />
      <CommandPalette onViewChange={setActiveView} />
      <AdminDashboard />
      <AchievementSystem />
    </>
  );
}

export default App;
