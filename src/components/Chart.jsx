import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import AddToPortfolio from './AddToPortfolio';
import { calculateGaussianChannel } from '../utils/gaussianChannel';
import './Chart.css';

const Chart = ({ data, symbol, onAddToPortfolio, mode = 'stock', markers = [], metadata = {}, onBackToStock, study = null }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candlestickSeriesRef = useRef();
  const lineSeriesRef = useRef();
  const markersRef = useRef([]);

  // Gaussian Channel series refs
  const gaussianFilterSeriesRef = useRef();
  const gaussianUpperBandSeriesRef = useRef();
  const gaussianLowerBandSeriesRef = useRef();

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

  // Update Gaussian Channel overlay based on study selection
  useEffect(() => {
    if (!chartRef.current || mode !== 'stock' || !data || data.length === 0) {
      // Remove Gaussian Channel series if they exist
      if (gaussianFilterSeriesRef.current) {
        if (Array.isArray(gaussianFilterSeriesRef.current)) {
          gaussianFilterSeriesRef.current.forEach(series => {
            try {
              chartRef.current.removeSeries(series);
            } catch (e) {}
          });
        } else {
          try {
            chartRef.current.removeSeries(gaussianFilterSeriesRef.current);
          } catch (e) {}
        }
        gaussianFilterSeriesRef.current = null;
      }
      if (gaussianUpperBandSeriesRef.current) {
        try {
          chartRef.current.removeSeries(gaussianUpperBandSeriesRef.current);
        } catch (e) {}
        gaussianUpperBandSeriesRef.current = null;
      }
      if (gaussianLowerBandSeriesRef.current) {
        try {
          chartRef.current.removeSeries(gaussianLowerBandSeriesRef.current);
        } catch (e) {}
        gaussianLowerBandSeriesRef.current = null;
      }
      return;
    }

    // Remove existing Gaussian series
    if (gaussianFilterSeriesRef.current) {
      if (Array.isArray(gaussianFilterSeriesRef.current)) {
        // Multiple series (new segmented approach)
        gaussianFilterSeriesRef.current.forEach(series => {
          try {
            chartRef.current.removeSeries(series);
          } catch (e) {}
        });
      } else {
        // Single series (old approach)
        try {
          chartRef.current.removeSeries(gaussianFilterSeriesRef.current);
        } catch (e) {}
      }
      gaussianFilterSeriesRef.current = null;
    }
    if (gaussianUpperBandSeriesRef.current) {
      try {
        chartRef.current.removeSeries(gaussianUpperBandSeriesRef.current);
      } catch (e) {}
      gaussianUpperBandSeriesRef.current = null;
    }
    if (gaussianLowerBandSeriesRef.current) {
      try {
        chartRef.current.removeSeries(gaussianLowerBandSeriesRef.current);
      } catch (e) {}
      gaussianLowerBandSeriesRef.current = null;
    }

    // If Gaussian study is selected, add the overlay
    if (study === 'Gaussian') {
      console.log('Gaussian study selected, data length:', data?.length);

      // Validate data before calculating
      if (!data || data.length < 10) {
        console.warn('Not enough data points for Gaussian Channel');
        return;
      }

      // Check if data has required properties
      const hasValidData = data.every(d =>
        d &&
        typeof d.high === 'number' &&
        typeof d.low === 'number' &&
        typeof d.close === 'number' &&
        isFinite(d.high) &&
        isFinite(d.low) &&
        isFinite(d.close)
      );

      if (!hasValidData) {
        console.error('Invalid data format for Gaussian Channel');
        return;
      }

      const gaussian = calculateGaussianChannel(data);

      // Check if gaussian calculation succeeded
      if (!gaussian.filter || gaussian.filter.length === 0) {
        console.warn('Gaussian Channel calculation failed');
        return;
      }

      // Split data into bullish (green) and bearish (red) segments
      // We'll create separate series for each color segment
      const segments = [];
      let currentSegment = null;
      let currentColor = null;

      for (let i = 0; i < gaussian.rawFilter.length; i++) {
        // Determine if this point is bullish or bearish
        const isBullish = i === 0 ? true : gaussian.rawFilter[i] >= gaussian.rawFilter[i - 1];
        const color = isBullish ? '#0aff68' : '#ff0a5a';

        // If color changed or first point, start new segment
        if (color !== currentColor) {
          if (currentSegment) {
            // Add the first point of next segment to current segment for continuity
            currentSegment.filter.push(gaussian.filter[i]);
            currentSegment.upper.push(gaussian.upperBand[i]);
            currentSegment.lower.push(gaussian.lowerBand[i]);
            segments.push(currentSegment);
          }

          // Start new segment
          currentSegment = {
            color: color,
            filter: [gaussian.filter[i]],
            upper: [gaussian.upperBand[i]],
            lower: [gaussian.lowerBand[i]]
          };
          currentColor = color;
        } else {
          // Continue current segment
          currentSegment.filter.push(gaussian.filter[i]);
          currentSegment.upper.push(gaussian.upperBand[i]);
          currentSegment.lower.push(gaussian.lowerBand[i]);
        }
      }

      // Add final segment
      if (currentSegment) {
        segments.push(currentSegment);
      }

      // Create series for each segment
      const allSeries = [];

      segments.forEach(segment => {
        // Upper band
        const upperSeries = chartRef.current.addSeries(LineSeries, {
          color: segment.color,
          lineWidth: 1,
          priceScaleId: 'right',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        upperSeries.setData(segment.upper);
        allSeries.push(upperSeries);

        // Filter (middle) line
        const filterSeries = chartRef.current.addSeries(LineSeries, {
          color: segment.color,
          lineWidth: 2,
          priceScaleId: 'right',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        filterSeries.setData(segment.filter);
        allSeries.push(filterSeries);

        // Lower band
        const lowerSeries = chartRef.current.addSeries(LineSeries, {
          color: segment.color,
          lineWidth: 1,
          priceScaleId: 'right',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        lowerSeries.setData(segment.lower);
        allSeries.push(lowerSeries);
      });

      // Store all series for cleanup
      gaussianFilterSeriesRef.current = allSeries;

      // Note: lightweight-charts doesn't have a built-in area between two lines feature
      // The channel fill would need to be implemented with a custom plugin or overlay canvas
      // For now, we'll just show the three lines (upper, middle, lower)
    }
  }, [study, data, mode]);

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
