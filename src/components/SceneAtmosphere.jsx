import { useTheme } from '../contexts/ThemeContext';
import AdventureCampfire from './AdventureCampfire';
import AdventureWind from './AdventureWind';

export default function SceneAtmosphere() {
  const { theme, mode } = useTheme();
  const showCampfire = theme === 'adventure' && mode === 'night';
  const showWind = theme === 'adventure' && mode === 'day';

  return (
    <>
      <div className="scene__atmosphere" aria-hidden="true" />
      {showWind && (
        <div className="scene__wind" aria-hidden="true">
          <AdventureWind />
        </div>
      )}
      {showCampfire && (
        <div className="scene__campfire" aria-hidden="true">
          <AdventureCampfire />
        </div>
      )}
    </>
  );
}
