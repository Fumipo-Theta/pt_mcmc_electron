
from fumipo_stat import as_dict, r_matrix_to_table
import numpy as np
from functools import reduce
from typing import Callable, Iterable, List, Sequence, TypeVar, Union

import rpy2.robjects as robjects
from rpy2.robjects.packages import importr
from rpy2.robjects import pandas2ri, numpy2ri
pandas2ri.activate()
pandas2ri.activate()

base = importr('base')
genlasso = importr('genlasso')
importr('dplyr', on_conflict="warn")
importr('tidyr')
importr('broom')
importr('purrr')

Number = Union[int, float]
T = TypeVar('T')
S = TypeVar('S')


def get_MSE(observed: Sequence[Number], modeled: Sequence[Number]) -> Number:
    if len(observed) is not len(modeled):
        raise ValueError("observed and modeled must be the same length")

    n = len(observed)
    diff = map(lambda t: t[0] - t[1], zip(observed, modeled))
    sq_sum = reduce(lambda acc, e: acc+e**2, diff, 0.)

    return np.sqrt(sq_sum/n)


assert(
    np.allclose(get_MSE([0, 0, 0], [0, 1, 2]),
                np.sqrt((0+1+4)/3))
)


def _rolling(seq: Sequence[T], num: int, func: Callable[[Sequence[T]], S], center=False)->List[S]:
    new_list = []
    padding = [np.nan] * num

    for i in range(len(seq) - num):
        new_list.append(func(seq[i:i+num+1]))

    if center:
        return new_list + padding
    else:
        return padding + new_list


assert(
    np.allclose(
        _rolling([0, 1, 2, 3, 4], 1, lambda s: s[1]-s[0]),
        [np.nan, 1, 1, 1, 1],
        equal_nan=True
    )
)


def _is_flat(eps: float) -> Callable[[Sequence[Number]], bool]:
    return lambda s: np.abs(s[0] - s[1]) < eps


def _search_edge(seq: Sequence[Number], eps: float, center: bool=False) -> List[bool]:
    flat_part = _rolling(seq, 1, _is_flat(eps))

    def roll(s: Sequence[bool])->bool:
        prev, next_ = s
        if np.isnan(prev):
            return False
        else:
            return prev != next_

    return _rolling(flat_part, 1, roll,  center=center)


def _map_index_to_elem(indexes: Iterable[int], elems: Sequence[T])->Iterable[T]:
    return map(lambda i: elems[i], indexes)


def get_edge(seq: Sequence[Number], eps: float, mapping_to: Sequence[Number]=None)->List[Number]:

    _mapping = range(len(seq)) if mapping_to is None else mapping_to

    is_edges = _search_edge(seq, eps, center=True)

    indexes: List[int] = reduce(
        lambda acc, e: acc + [e[0]] if e[1] == True else acc,
        enumerate(is_edges),
        []
    )

    return list(_map_index_to_elem(
        indexes,
        _mapping
    ))


def get_slope_center(seq: Sequence[Number], eps: float, mapping_to: Sequence[Number]=None) -> List[Number]:
    _mapping = range(len(seq)) if mapping_to is None else mapping_to

    flat_part = _rolling(seq, 1, _is_flat(eps), center=False)

    def check_slope(xor_func: Callable[[Sequence[bool]], bool])->Callable[[Sequence[bool]], Iterable[int]]:
        return lambda bools: map(
            lambda v: v[0],
            filter(
                lambda v: v[1] == True,
                enumerate(_rolling(bools, 1, xor_func, center=True))
            )
        )

    slope_start = _map_index_to_elem(
        check_slope(lambda s: s[0] == True and s[1] == False)(flat_part),
        _mapping
    )

    slope_end = _map_index_to_elem(
        check_slope(lambda s: s[0] == False and s[1] == True)(flat_part),
        _mapping
    )

    if flat_part[1] == True:
        slopes = zip(slope_start, slope_end)
    else:
        slopes = zip(slope_start, list(slope_end)[1:])

    return list(map(np.mean, slopes))


__test_seq = [1, 1, 1, 0, 0, 0.5, 1, 1, 1.5, 1.5, 1.5, 1]

assert(np.allclose(
    _rolling(__test_seq, 1, _is_flat(1e-5), center=True),
    [True, True, False, True, False, False, True, False, True, True, False, np.nan],
    equal_nan=True
))


assert(np.allclose(
    _search_edge(__test_seq, 1e-5, center=True),
    [False, False,  True, True, True, False,
        True, True, True, False, True, np.nan],
    equal_nan=True
))

assert(
    get_edge(__test_seq, 1e-5)
    == [2, 3, 4, 6, 7, 8, 10]
)

assert(
    list(_map_index_to_elem([0, 2, 4], ["a", "b", "c", "d", "e", "f"]))
    == ["a", "c", "e"]
)

robjects.r("""
apply_fused_lasso <- function(signal){

    get_coef <- function(cv, signal){
        signal %>%
            fusedlasso1d %>%
            coef(lambda=cv$lambda.1se) -> coef_

        return (coef_)
    }


    fusedlasso1d(signal) %>%
        cv.trendfilter -> cv_

    fusedlasso1d(signal) %>%
        cv.trendfilter %>%
        get_coef(., signal) -> coef_

    return (c(cv_, coef_))
}
""")


def fusedlasso(signal_1d: Sequence[Number]) -> dict:
    """
    Returns dict converted from R object.
    Keys:

    err: FloatVector
    se: FloatVector
    mode: "lambda" |
    lambda: float : Regularization factor
    lambda.min: float : Minimum regularization factor in closs validation
    lambda.1se: float : Regularization factor by 1se method by cv
    i.min
    i.1se

    beta: Marix : Estimated values corresponding to input signal
    df: float: Degree of freedom

    """
    robjects.r.assign("signal", signal_1d)
    return as_dict(robjects.r(f"apply_fused_lasso(signal)"))
