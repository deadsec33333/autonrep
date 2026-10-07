import {config} from '../../config';
import {mock} from './mock';
import {live} from './live';
export const data=config.USE_MOCKS?mock:live;
export type * from './types';
