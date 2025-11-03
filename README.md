# Stock Chart Viewer

A modern stock price visualization application built with React and TradingView's lightweight-charts library.

## Features

- 📈 **Interactive Candlestick Charts** - Powered by TradingView's lightweight-charts
- 🔍 **Multiple Timeframes** - View data in 5-minute, hourly, 4-hour, or daily intervals
- 📅 **Flexible Time Ranges** - Select YTD, 1Y, 5Y, or custom date ranges
- 🎯 **Popular Tickers** - Quick access to AAPL, GOOGL, MSFT, AMZN, TSLA, NVDA, and META
- 🌙 **Dark Theme** - Beautiful dark UI optimized for extended viewing
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. (Optional) Set up your Alpha Vantage API key:
   - Copy `.env.example` to `.env`
   - Get a free API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Add your API key to the `.env` file

```bash
cp .env.example .env
# Edit .env and add your API key
```

### Running the App

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Usage

1. **Select a Ticker**: Enter a stock symbol or click one of the popular tickers
2. **Choose Time Range**: Select YTD, 1Y, 5Y, or set a custom date range
3. **Pick Timeframe**: Switch between 5-minute, hourly, 4-hour, or daily candles
4. **Interact with Chart**: Hover over candles to see OHLC data, scroll to zoom, drag to pan

## Data Sources

- **With API Key**: Real data from Alpha Vantage
- **Without API Key**: Realistic mock data generated locally

## Technologies Used

- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) - Charting library
- [date-fns](https://date-fns.org/) - Date utilities
- [Alpha Vantage API](https://www.alphavantage.co/) - Stock data (optional)

## License

MIT
