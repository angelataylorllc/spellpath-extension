import SceneShell from './SceneShell';

export default function AuthLoadingScreen() {
  return (
    <SceneShell contentClassName="scene__content ui-font text-center">
      <p className="ui-subtitle">Checking sign-in…</p>
    </SceneShell>
  );
}
