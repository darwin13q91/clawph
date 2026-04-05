import { Link } from 'react-router-dom';
import AnimatedLogo from '../components/AnimatedLogo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-jungle flex flex-col items-center justify-center px-6 text-center">
      <Link to="/" className="flex items-center gap-3 mb-12">
        <AnimatedLogo size={40} />
        <span className="font-display text-2xl font-bold text-warm tracking-tight">
          ClawPH
        </span>
      </Link>

      <h1 className="font-display text-[clamp(64px,10vw,120px)] font-black text-neon leading-none mb-4">
        404
      </h1>
      <h2 className="font-display text-[clamp(24px,3vw,36px)] font-bold text-warm uppercase tracking-tight mb-4">
        Page Not Found
      </h2>
      <p className="text-warm-72 text-lg max-w-md mb-10">
        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        <Link to="/" className="btn-primary flex items-center gap-2">
          Back to Home
        </Link>
        <Link to="/about" className="btn-secondary flex items-center gap-2">
          About Us
        </Link>
      </div>
    </div>
  );
}
