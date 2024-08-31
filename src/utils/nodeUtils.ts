import {byId} from "./shorthands";

// get next unused id
export function getNextId(core: string, index = 1) {
  while (byId(core + index)) index++;
  return core + index;
}

export function getInputValue(id: string) {
  const $element = byId(id);
  if (!$element) throw new Error(`Element ${id} not found`);
  if (!("value" in $element)) throw new Error(`Element ${id} is not an input`);

  return (byId(id) as HTMLInputElement)?.value;
}

export function getInputNumber(id: string) {
  const $element = byId(id);
  if (!$element) throw new Error(`Element ${id} not found`);
  if (!("value" in $element)) throw new Error(`Element ${id} is not an input`);

  return (byId(id) as HTMLInputElement)?.valueAsNumber;
}

export function setInputValue(id: string, value: string | number | boolean) {
  const $element = byId(id);
  if (!$element) throw new Error(`Element ${id} not found`);
  if (!("value" in $element)) throw new Error(`Element ${id} is not an input`);

  ($element as HTMLInputElement).value = String(value);
}

export function getSelectedOption(id: string) {
  const $element = byId(id);
  if (!$element) throw new Error(`Element ${id} not found`);

  return ($element as HTMLSelectElement).selectedOptions[0];
}

// apply drop-down menu option. If the value is not in options, add it
export function applyDropdownOption($select: HTMLSelectElement, value: string, name = value) {
  const isExisting = Array.from($select.options).some(o => o.value === value);
  if (!isExisting) $select.options.add(new Option(name, value));
  $select.value = value;
}

type ElementPredictor<N extends string> = 
N extends `${string}Content` ? HTMLDivElement :
N extends `${string}Trigger` ? HTMLButtonElement :
N extends `${string}Options` ? HTMLSelectElement :
N extends `${string}ColorInput` ? HTMLInputElement :
N extends `${string}Input` ? HTMLInputElement :
N extends `${string}Output` ? HTMLInputElement :
HTMLElement;
type TypePredictor<N extends string> = 
N extends `${string}Content` ? never :
N extends `${string}Trigger` ? string :
N extends `${string}Options` ? string :
N extends `${string}ColorInput` ? string :
N extends `${string}Input` ? number :
N extends `${string}Output` ? number :
never;



/**
 * Represents an HTML wrapper class.
 * Type is inferred from the ID naming.
 * Provides typing for valueed input elements.
 * @template IDTYPE - The type of the element's ID.
 * @template ElemType - The type of the HTML element.
 * @template ValType - The type of the element's value.
 * @argument id - The ID of the element.
 * 
 * @example
 * // infered types
 * const input = new HtmlWrapper("someInput"); // Is an HTMLInputElement and its value is number by default
 * const stringInput = new HtmlWrapper<"",string>("someStringInput"); // Is an HTMLInputElement and its value is string
 * 
 * @example
 * // explicit types
 * const inputThatIsNotNamedCorrectly = new HtmlWrapper<"Input",string>("someString"); // Is an HTMLInputElement and its value is number
 * // OR
 * const inputThatIsNotNamedCorrectly = new HtmlWrapper<"",string,HTMLInputElement>("someString"); // Is an HTMLInputElement and its value is string
 * 
 */
export class HtmlWrapper<IDTYPE extends string = "", ValType = TypePredictor<IDTYPE>, ElemType extends HTMLElement = ElementPredictor<IDTYPE>>{
  // OPTIMIZATION: avoid duplicate DOM queries
  // static cache to store instances - class global
  static cache: Record<string, HtmlWrapper<any,any,any>> = {};
  
  // Member variables
  #element!: ElemType;
  
  // Member functions
  // Uses the IDTYPE to infer the type of the element
  constructor(id: IDTYPE | string){
    if(HtmlWrapper.cache[id] !== undefined){
      return HtmlWrapper.cache[id];
    }
    this.#element = byId(id) as ElemType;
    if (!this.#element) throw new Error(`Element ${id} not found`);
    HtmlWrapper.cache[id] = this;
  }

  get element(){
    return this.#element;
  }

  get value() {
    return (this.#element as unknown as HTMLInputElement)?.value as unknown as ValType;
  }

  set value(v:ValType) {
    (this.#element as unknown as HTMLInputElement).value = v as any;
  }

  get style() {
    return this.#element.style;
  }
  
  on(event: string, callback: (e: Event) => void) {
    this.#element.addEventListener(event, callback);
  }

}
