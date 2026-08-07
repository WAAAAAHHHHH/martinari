import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.js';

export default function ErrorPage() {
  const [params] = useSearchParams();
  const isNotFound = params.get('error') === 'not_found';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 max-w-sm"
      >
        <div className="text-7xl font-bold text-border font-mono select-none tracking-tight">
          {isNotFound ? '404' : '???'}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-primary mb-2">
            {isNotFound ? 'Room not found' : 'Page not found'}
          </h1>
          <p className="text-secondary text-sm leading-relaxed">
            {isNotFound
              ? 'This room may have expired or the code is incorrect. Rooms close 30 seconds after the last person leaves.'
              : "This page doesn't exist."}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 w-full">
          <Link to="/" replace id="link-go-home">
            <Button variant="primary" size="lg" fullWidth icon={<Home className="w-4 h-4" />}>
              Go home
            </Button>
          </Link>
          <button
            onClick={() => window.history.back()} id="btn-go-back"
            className="text-sm text-secondary hover:text-primary transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
