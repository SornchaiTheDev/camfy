import { useDiscoverOnvif } from "../../api/cameras";
import type { OnvifDiscoveredDevice } from "../../types";
import clsx from "clsx";

type Props = {
  onSelect: (device: OnvifDiscoveredDevice) => void;
};

export function DiscoverPanel({ onSelect }: Props) {
  const discover = useDiscoverOnvif();

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={() => discover.mutate()}
          disabled={discover.isPending}
          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-500 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {discover.isPending && (
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {discover.isPending ? "Scanning..." : "Scan Network"}
        </button>
        {discover.isSuccess && (
          <span className="text-xs text-gray-400">
            {discover.data.devices.length} device(s) found
          </span>
        )}
      </div>

      {discover.isSuccess && discover.data.devices.length === 0 && (
        <p className="text-xs text-gray-500">
          No ONVIF devices found. Try entering the camera IP manually below.
        </p>
      )}

      {discover.isSuccess && discover.data.devices.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {discover.data.devices.map((dev) => (
            <button
              key={dev.host}
              type="button"
              onClick={() => onSelect(dev)}
              className={clsx(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                "bg-gray-700 text-gray-200 hover:bg-blue-700 hover:text-white"
              )}
            >
              <span className="font-mono">{dev.host}</span>
              <span className="text-gray-400 ml-2">:{dev.port}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
