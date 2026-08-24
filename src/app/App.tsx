import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import DevData from '@/pages/DevData';
import DevSession from '@/pages/DevSession';
import Home from '@/pages/Home';
import PracticeConfig from '@/pages/PracticeConfig';
import ReviewConfig from '@/pages/ReviewConfig';
import SimulatorConfig from '@/pages/SimulatorConfig';
import StudentSession from '@/pages/StudentSession';
import Results from '@/pages/Results';
import PostSessionReview from '@/pages/PostSessionReview';
import Study from '@/pages/Study';
import NotFound from '@/pages/NotFound';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ExamSessionProvider } from '@/context/ExamSessionContext';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ExamSessionProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<PracticeConfig />} />
            <Route path="/review" element={<ReviewConfig />} />
            <Route path="/simulator" element={<SimulatorConfig />} />
            <Route path="/session/:sessionId" element={<StudentSession />} />
            <Route path="/results/:sessionId" element={<Results />} />
            <Route path="/results/:sessionId/review" element={<PostSessionReview />} />
            <Route path="/study" element={<Study />} />
            
            {/* Conditional Developer Routes */}
            {import.meta.env.DEV && (
              <>
                <Route path="/dev/data" element={<DevData />} />
                <Route path="/dev/session" element={<DevSession />} />
              </>
            )}

            {/* Fallback to NotFound */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ExamSessionProvider>
    </ErrorBoundary>
  );
};

export default App;
