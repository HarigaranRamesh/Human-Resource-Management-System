import {
  Pencil,
  Trash2,
  Search,
  Save,
  ArrowLeft,
  X,
  CheckCircle2,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { createIcon } from './createIcon';

export const EditIcon = createIcon('EditIcon', Pencil);
export const PencilIcon = EditIcon;

export const DeleteIcon = createIcon('DeleteIcon', Trash2);
export const TrashIcon = DeleteIcon;

export const SearchIcon = createIcon('SearchIcon', Search);

export const SaveIcon = createIcon('SaveIcon', Save);

export const BackIcon = createIcon('BackIcon', ArrowLeft);
export const ArrowLeftIcon = BackIcon;

export const CloseIcon = createIcon('CloseIcon', X);
export const XIcon = CloseIcon;

export const CheckCircleIcon = createIcon('CheckCircleIcon', CheckCircle2);
export const CheckIcon = createIcon('CheckIcon', Check);

export const AlertTriangleIcon = createIcon('AlertTriangleIcon', AlertTriangle);
export const AlertCircleIcon = createIcon('AlertCircleIcon', AlertCircle);
export const AlertIcon = AlertTriangleIcon;

export const InfoIcon = createIcon('InfoIcon', Info);

export const LoadingIcon = createIcon('LoadingIcon', Loader2);
export const SpinnerIcon = LoadingIcon;

export const RefreshIcon = createIcon('RefreshIcon', RefreshCw);
export const FilterIcon = createIcon('FilterIcon', Filter);
