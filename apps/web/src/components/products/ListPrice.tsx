type ListPriceProps = {
  amount: string;
  showFrom?: boolean;
  size?: "card" | "panel" | "page";
  currency?: string;
  className?: string;
};

const amountSizeClass: Record<NonNullable<ListPriceProps["size"]>, string> = {
  card: "text-lg",
  panel: "text-2xl",
  page: "text-3xl",
};

/**
 * Primary catalog price: inline “From” + amount (one line).
 */
export function ListPrice({
  amount,
  showFrom = false,
  size = "card",
  currency,
  className,
}: ListPriceProps) {
  return (
    <div
      className={`flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0 ${className ?? ""}`}
    >
      <span
        className={`font-display font-bold tabular-nums leading-tight text-ink-900 ${amountSizeClass[size]}`}
      >
        {showFrom ? (
          <span className="mr-1 text-sm font-semibold text-ink-600">From</span>
        ) : null}
        ${amount}
      </span>
      {currency ? (
        <span className="text-sm font-normal text-ink-500">{currency}</span>
      ) : null}
    </div>
  );
}
