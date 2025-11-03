import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import AddToPortfolio from './AddToPortfolio';
import './Chart.css';

const Chart = ({ data, symbol, onAddToPortfolio }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candlestickSeriesRef = useRef();

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

    // Create candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

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

  useEffect(() => {
    if (candlestickSeriesRef.current && data && data.length > 0) {
      candlestickSeriesRef.current.setData(data);

      // Add 5 candle padding on both sides using logical range
      if (data.length > 10) {
        // For larger datasets, use logical range with padding
        const timeScale = chartRef.current.timeScale();

        // Use a small delay to ensure data is fully loaded
        setTimeout(() => {
          timeScale.setVisibleLogicalRange({
            from: -5,
            to: data.length + 4
          });
        }, 0);
      } else if (data.length >= 2) {
        // For smaller datasets, fit all content with padding
        const timeScale = chartRef.current.timeScale();

        setTimeout(() => {
          timeScale.fitContent();
          // Then adjust with padding
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
  }, [data]);

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <h2>{symbol || 'Select a ticker'}</h2>
        {symbol && <AddToPortfolio symbol={symbol} onAddClick={onAddToPortfolio} />}
      </div>
      <div ref={chartContainerRef} className="chart-container" />
    </div>
  );
};

export default Chart;
