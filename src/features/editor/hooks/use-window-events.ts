import { useEvent } from "react-use";

export const useWindowEvents = () => {
  useEvent("beforeunload", (event) => {
    (event || window.event).returnValue = "Are you sure you want to leave?";
  });
};
