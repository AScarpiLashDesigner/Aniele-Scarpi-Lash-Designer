interface Window {
  AS_prices: {
    bind(form: HTMLFormElement | null): void;
    suggest(technique: string): Promise<number | null>;
    suggestedMaintenance(technique: string): string;
  };
}
