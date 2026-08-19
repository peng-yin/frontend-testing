import { useCallback, useEffect, useState } from "react";
import { getUser, type User } from "../api/users";

interface UserProfileProps {
  userId: string;
}

type State =
  | { status: "loading"; userId: string }
  | { status: "success"; userId: string; user: User }
  | { status: "error"; userId: string; message: string };

export function UserProfile({ userId }: UserProfileProps) {
  const [state, setState] = useState<State>({ status: "loading", userId });
  const [requestVersion, setRequestVersion] = useState(0);

  const reload = useCallback(() => {
    setState({ status: "loading", userId });
    setRequestVersion((version) => version + 1);
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();

    void getUser(userId, controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) {
          setState({ status: "success", userId, user });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            userId,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [requestVersion, userId]);

  const visibleState: State =
    state.userId === userId ? state : { status: "loading", userId };

  if (visibleState.status === "loading") {
    return <p role="status">Loading user…</p>;
  }

  if (visibleState.status === "error") {
    return (
      <section aria-labelledby="user-error-title">
        <h2 id="user-error-title">User unavailable</h2>
        <p role="alert">{visibleState.message}</p>
        <button type="button" onClick={reload}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <article aria-labelledby="user-name">
      <h2 id="user-name">{visibleState.user.name}</h2>
      <p>Role: {visibleState.user.role}</p>
      <p>Profile ID: {visibleState.user.id}</p>
      <button type="button" onClick={reload}>
        Refresh
      </button>
    </article>
  );
}
