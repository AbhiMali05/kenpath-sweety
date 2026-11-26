export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="state-card state-error" role="alert">
      <span className="state-icon" aria-hidden="true">!</span>
      <div><strong>We couldn’t complete that.</strong><p>{message}</p></div>
      {onRetry && <button className="button button-secondary" onClick={onRetry} type="button">Try again</button>}
    </div>
  );
}
