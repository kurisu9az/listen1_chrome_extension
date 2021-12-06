import { reactive } from 'vue';

const overlay = reactive({ type: '' });

const setOverlayType = (newType: string) => {
  overlay.type = newType;
};

function useOverlay() {
  return { overlay, setOverlayType };
}

export default useOverlay;
