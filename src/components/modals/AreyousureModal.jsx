import React from "react";

const AreyousureModal = ({ onClose, onNext }) => {
  return (
    <div className="h-full bg-black/50 w-full absolute inset-0 top-0">
      <div className="h-full w-full flex justify-center items-center">
        <div className="h-[25%] w-[30%] bg-white mx-auto  rounded-xl p-5 flex flex-col justify-center">
          <p className="text-[24px]">
            Are you sure you want to move on to the next question ?
          </p>
          <div className="flex justify-end items-center space-x-2">
            <button
              onClick={onClose}
              className="px-[20px] py-[2px] border-1 border-blue-200 rounded bg-blue-100 font-semibold capitalize cursor-pointer"
            >
              close
            </button>
            <button
              onClick={onNext}
              className="px-[20px] py-[2px] border-1 border-blue-200 rounded bg-blue-100 font-semibold capitalize cursor-pointer"
            >
              next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreyousureModal;
