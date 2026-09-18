import SceneAtmosphere from './SceneAtmosphere';

export default function SceneShell({ contentClassName = 'scene__content ui-font', settings, children }) {
  return (
    <>
      <main className="scene">
        <SceneAtmosphere />
        <div className={contentClassName}>
          {children}
        </div>
      </main>
      {settings}
    </>
  );
}
