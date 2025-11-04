import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import AddToPortfolio from './AddToPortfolio';
import './Chart.css';

const Chart = ({ data, symbol, onAddToPortfolio, mode = 'stock', markers = [], metadata = {}, onBackToStock }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candlestickSeriesRef = useRef();
  const lineSeriesRef = useRef();
  const markersRef = useRef([]);

  useEffect(() => {
    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1e1e1e' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
      },
      crosshair: {
        mode: 1,
      },
    });

    chartRef.current = chart;

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update series based on mode
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Remove existing series safely
    try {
      if (candlestickSeriesRef.current) {
        chartRef.current.removeSeries(candlestickSeriesRef.current);
        candlestickSeriesRef.current = null;
      }
    } catch (e) {
      // Series may already be removed
      candlestickSeriesRef.current = null;
    }

    try {
      if (lineSeriesRef.current) {
        chartRef.current.removeSeries(lineSeriesRef.current);
        lineSeriesRef.current = null;
      }
    } catch (e) {
      // Series may already be removed
      lineSeriesRef.current = null;
    }

    // Remove existing markers
    markersRef.current.forEach(marker => {
      if (marker && marker.remove) marker.remove();
    });
    markersRef.current = [];

    if (mode === 'portfolio') {
      // Create line series for portfolio
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: '#2962FF',
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (price) => price.toFixed(2),
        },
      });

      lineSeries.setData(data);

      // Add markers for rebalancing events
      if (markers && markers.length > 0) {
        const markerData = markers.map(marker => ({
          time: marker.time,
          position: 'belowBar',
          color: '#f68410',
          shape: 'circle',
          text: `${marker.symbol} (${marker.quantity})`,
        }));
        try {
          lineSeries.setMarkers(markerData);
        } catch (e) {
          console.warn('Markers not supported in this version of lightweight-charts');
        }
      }

      lineSeriesRef.current = lineSeries;

      // Fit content with padding
      setTimeout(() => {
        const timeScale = chartRef.current.timeScale();
        timeScale.fitContent();
      }, 0);
    } else {
      // Create candlestick series for stock
      const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      candlestickSeries.setData(data);
      candlestickSeriesRef.current = candlestickSeries;

      // Add 5 candle padding on both sides using logical range
      if (data.length > 10) {
        const timeScale = chartRef.current.timeScale();
        setTimeout(() => {
          timeScale.setVisibleLogicalRange({
            from: -5,
            to: data.length + 4
          });
        }, 0);
      } else if (data.length >= 2) {
        const timeScale = chartRef.current.timeScale();
        setTimeout(() => {
          timeScale.fitContent();
          const visibleRange = timeScale.getVisibleLogicalRange();
          if (visibleRange) {
            timeScale.setVisibleLogicalRange({
              from: visibleRange.from - 5,
              to: visibleRange.to + 5
            });
          }
        }, 0);
      }
    }
  }, [data, mode, markers]);

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        {mode === 'portfolio' ? (
          <>
            <div className="portfolio-chart-title">
              <h2>Portfolio Performance Index</h2>
              {metadata && (
                <div className="portfolio-stats-inline">
                  <span className="stat-item">Index: {metadata.currentValue?.toFixed(2) || 100}</span>
                  <span className={`stat-item ${metadata.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                    Return: {metadata.totalReturn >= 0 ? '+' : ''}{metadata.totalReturn?.toFixed(2)}%
                  </span>
                  <span className="stat-item">Positions: {metadata.positionCount}</span>
                </div>
              )}
            </div>
            <button className="back-to-stock-btn" onClick={onBackToStock}>
              Back to Stock Chart
            </button>
          </>
        ) : (
          <div className="stock-chart-title">
            <h2>{symbol || 'Select a ticker'}</h2>
            {symbol && <AddToPortfolio symbol={symbol} onAddClick={onAddToPortfolio} />}
          </div>
        )}
      </div>
      <div ref={chartContainerRef} className="chart-container" />
    </div>
  );
};

export default Chart;
