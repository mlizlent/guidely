import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/layout/Layout';
import { Documents } from './pages/Documents';
import { Search } from './pages/Search';
import { Indexing } from './pages/Indexing';
import { Metrics } from './pages/Metrics';


function App() {
  return (
    <ToastProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Navigate to="/documents" replace />} />
          <Route element={<Layout />}>
            <Route path="documents" element={<Documents />} />
            <Route path="search" element={<Search />} />
            <Route path="indexing" element={<Indexing />} />
            <Route path="metrics" element={<Metrics />} />
          </Route>
          <Route path="*" element={<Navigate to="/documents" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
