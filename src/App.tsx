import { useCallback, useState } from 'react';
import { GameView } from './components/GameView.tsx';
import { LobbyView } from './components/LobbyView.tsx';
import { WaitingRoomView } from './components/WaitingRoomView.tsx';
import { useMultiplayerSocket } from './hooks/useMultiplayerSocket.ts';
import type { GameEventPayload } from './shared/types.ts';

export default function App() {
  const [pendingEvents, setPendingEvents] = useState<GameEventPayload[]>([]);

  const handleVisualEvent = useCallback((event: GameEventPayload) => {
    setPendingEvents((prev) => [...prev.slice(-20), event]);
  }, []);

  const handleEventsConsumed = useCallback(() => {
    setPendingEvents([]);
  }, []);

  const {
    connected,
    myId,
    publicRooms,
    roomState,
    currentQuestion,
    quizFeedback,
    killFeed,
    errorMsg,
    clearError,
    refreshRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoomConfig,
    startMatch,
    rematch,
    sendMoveInput,
    sendMoveTo,
    toggleCover,
    answerQuiz,
    throwSnowball,
  } = useMultiplayerSocket(handleVisualEvent);

  if (!roomState || !myId) {
    return (
      <LobbyView
        connected={connected}
        publicRooms={publicRooms}
        errorMsg={errorMsg}
        onClearError={clearError}
        onRefreshRooms={refreshRooms}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
      />
    );
  }

  if (roomState.phase === 'WAITING') {
    return (
      <WaitingRoomView
        roomState={roomState}
        myId={myId}
        onUpdateConfig={updateRoomConfig}
        onStartMatch={startMatch}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  return (
    <GameView
      roomState={roomState}
      myId={myId}
      currentQuestion={currentQuestion}
      quizFeedback={quizFeedback}
      killFeed={killFeed}
      pendingEvents={pendingEvents}
      onEventsConsumed={handleEventsConsumed}
      onMoveInput={sendMoveInput}
      onMoveTo={sendMoveTo}
      onToggleCover={toggleCover}
      onAnswerQuiz={answerQuiz}
      onThrowSnowball={throwSnowball}
      onRematch={rematch}
      onLeaveRoom={leaveRoom}
    />
  );
}
