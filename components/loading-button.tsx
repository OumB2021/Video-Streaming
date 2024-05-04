import { Transition } from "@headlessui/react";
import { RefreshCwIcon } from "lucide-react";
import React from "react";
import { Button, ButtonProps } from "./ui/button";

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, loading, disabled, ...props }, ref) => {
    return (
      <Button
        type="submit"
        disabled={loading ?? disabled ?? false}
        ref={ref}
        {...props}
      >
        <Transition
          show={loading ?? false}
          enter="transition-all overflow-clip duration-150"
          enterFrom="opacity-0 w-0"
          enterTo="opacity-100 w-6"
          leave="transition-all overflow-clip duration-150"
          leaveFrom="opacity-100 w-6"
          leaveTo="opacity-0 w-0"
        >
          <RefreshCwIcon className="mr-1.5 size-4 animate-spin" />
        </Transition>
        {children}
      </Button>
    );
  }
);
LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
