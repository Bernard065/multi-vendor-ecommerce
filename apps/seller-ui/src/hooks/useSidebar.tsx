import { useAtom } from 'jotai';
import { activeSideBarItem } from '../constants/sidebar';

const useSidebar = () => {
  const [activeSidebar, setActiveSidebar] = useAtom(activeSideBarItem);

  return { activeSidebar, setActiveSidebar };
};

export default useSidebar;
