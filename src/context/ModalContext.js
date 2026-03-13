import { createContext, useContext, useState } from "react";
import Modal from "../components/Modal";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);

  const showModal = ({ title, message, buttons = [] }) => {
    setModal({ title, message, buttons });
  };

  const hideModal = () => setModal(null);

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      <Modal
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        buttons={modal?.buttons ?? []}
        onDismiss={hideModal}
      />
    </ModalContext.Provider>
  );
}

export const useModal = () => useContext(ModalContext);
