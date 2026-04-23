import type { CellValue, Column } from "./types";
import type { StorageAdapter } from "@filemark/core";
import {
  AvatarCell,
  BoolCell,
  CheckboxCell,
  CheckmarkCell,
  CodeBlockCell,
  CodeCell,
  ColorCell,
  CountryCell,
  CurrencyCell,
  DateCell,
  DurationCell,
  EmailCell,
  FilesizeCell,
  IconCell,
  IdCell,
  ImageCell,
  JsonCell,
  MarkdownCell,
  NumberCell,
  PercentageCell,
  PhoneCell,
  ProgressCell,
  RangeCell,
  RatingCell,
  RelativeCell,
  SparklineCell,
  StatusCell,
  TagsCell,
  UrlCell,
} from "./cells";

export interface CellRendererProps {
  value: CellValue;
  column: Column;
  rowId?: string;
  storage?: StorageAdapter;
  storageKey?: string;
  /** Space-separated terms to highlight inside plain-text / markdown
   *  cells. Structured types ignore it. */
  highlight?: string;
}

export function CellRenderer(props: CellRendererProps) {
  const { column } = props;
  switch (column.type) {
    case "status":
      return <StatusCell {...props} />;
    case "tags":
      return <TagsCell {...props} />;
    case "checkmark":
      return <CheckmarkCell {...props} />;
    case "checkbox":
      return <CheckboxCell {...props} />;
    case "rating":
      return <RatingCell {...props} />;
    case "progress":
      return <ProgressCell {...props} />;
    case "currency":
      return <CurrencyCell {...props} />;
    case "percentage":
      return <PercentageCell {...props} />;
    case "filesize":
      return <FilesizeCell {...props} />;
    case "url":
      return <UrlCell {...props} />;
    case "email":
      return <EmailCell {...props} />;
    case "phone":
      return <PhoneCell {...props} />;
    case "code":
      return <CodeCell {...props} />;
    case "color":
      return <ColorCell {...props} />;
    case "date":
      return <DateCell {...props} />;
    case "relative":
      return <RelativeCell {...props} />;
    case "avatar":
      return <AvatarCell {...props} />;
    case "sparkline":
      return <SparklineCell {...props} />;
    case "icon":
      return <IconCell {...props} />;
    case "country":
      return <CountryCell {...props} />;
    case "duration":
      return <DurationCell {...props} />;
    case "range":
      return <RangeCell {...props} />;
    case "code-block":
      return <CodeBlockCell {...props} />;
    case "json":
      return <JsonCell {...props} />;
    case "image":
      return <ImageCell {...props} />;
    case "id":
      return <IdCell {...props} />;
    case "number":
      return <NumberCell {...props} />;
    case "bool":
      return <BoolCell {...props} />;
    default:
      return <MarkdownCell {...props} />;
  }
}
