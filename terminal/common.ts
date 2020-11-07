export type FlowContext<CTX extends object> = CTX & {
    setGlobally: <K extends keyof CTX>(key: K, val: CTX[K]) => CTX[K]
};

// a context-change can be either for a specific field or change multiple properties or none at all.
export type ContextChange<CTX extends object> = CTX[keyof CTX] | Partial<CTX> | void;

// a step can either change the flow, do nothing or return something (like changing the flow).
export type StepResult<R extends ContextChange<object> | any> = R | void | Symbol;

// a step starts with a context and returns a step result to change the context or manipulate the flow.
export type Step<CTX extends object, R extends ContextChange<CTX> = ContextChange<CTX>> =
    (context: FlowContext<CTX>) => Promise<StepResult<R>>;

// general context step can change partial part of the context (or not).
export type GeneralContextStep<CTX extends object> = [step: Step<CTX, Partial<CTX> | void>];

// a specific prop step changes that prop in the context.
export type ContextPropStep<CTX extends object, K extends keyof CTX> = [ctxProp: K, step: Step<CTX, CTX[K]>];

// an app step can be either general or for a prop
export type AppStep<CTX extends object, K extends ((keyof CTX) | unknown) = never> =
    K extends keyof CTX ? ContextPropStep<CTX, K> : GeneralContextStep<CTX>;